import type { NextRequest } from "next/server";
import { errorResponse, okResponse } from "@/lib/errors";
import {
  createClient,
  getSessionUser,
  supabaseEnvMissingMessage,
} from "@/lib/supabase-server";
import {
  affiliationStartSchema,
  formatZodIssues,
} from "@/lib/validation";
import { normalizeEmail, domainOf } from "@/lib/operations";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  OTP_TTL_MS,
  generateOtpCode,
  hashOtpCode,
  sendChallengeEmail,
} from "@/lib/verification";

/**
 * POST /api/affiliations/start — begin university-mailbox verification.
 *
 * Privacy: never leaks whether an unrelated email is linked. A duplicate
 * address owned by someone else yields the same generic `{ started: true }`
 * shape with NO affiliation id. Unknown domains are NOT rejected — they
 * enter `self_reported` for manual review (per USER_FLOWS).
 */
export async function POST(req: NextRequest): Promise<Response> {
  const client = await createClient();
  if (!client) {
    return errorResponse(
      "dependency_unavailable",
      supabaseEnvMissingMessage(),
    );
  }
  const user = await getSessionUser(client);
  if (!user) return errorResponse("unauthenticated", "Sign in required.");

  const gate = checkRateLimit(`aff-start:${user.id}`, { limit: 5, windowMs: 60_000 });
  if (!gate.allowed) {
    return errorResponse("rate_limited", "Too many attempts. Retry shortly.");
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return errorResponse("validation", "Invalid JSON body.");
  }
  const parsed = affiliationStartSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "validation",
      "Invalid affiliation input.",
      formatZodIssues(parsed.error),
    );
  }

  const email = normalizeEmail(parsed.data.email);

  // Duplicate linkage (any owner) → generic response, no id, no signal.
  const { data: existing } = await client
    .from("affiliations")
    .select("id,user_id")
    .eq("normalized_email", email)
    .limit(1);
  const rows: Array<{ id: string; user_id: string }> = Array.isArray(existing)
    ? (existing as Array<{ id: string; user_id: string }>)
    : [];
  const ownedByOther = rows.some((r) => r.user_id !== user.id);
  if (ownedByOther) {
    return okResponse({ started: true });
  }

  // Resolve university: explicit id wins, else match approved domain.
  let universityId: string | null = parsed.data.university_id ?? null;
  let domainApproved = false;
  if (!universityId) {
    const domain = domainOf(email);
    const { data: match } = await client
      .from("university_domains")
      .select("university_id")
      .eq("domain", domain)
      .limit(1);
    const found: Array<{ university_id: string }> = Array.isArray(match)
      ? (match as Array<{ university_id: string }>)
      : [];
    if (found.length > 0 && found[0]) {
      universityId = found[0].university_id;
      domainApproved = true;
    }
  } else {
    const { data: match } = await client
      .from("university_domains")
      .select("university_id")
      .eq("university_id", universityId)
      .eq("domain", domainOf(email))
      .limit(1);
    domainApproved = Array.isArray(match) && match.length > 0;
  }

  const status = domainApproved ? "pending" : "self_reported";
  const { data: affiliation, error } = await client
    .from("affiliations")
    .insert({
      user_id: user.id,
      university_id: universityId,
      status,
      mailbox_verified: false,
      reviewed: false,
      normalized_email: email,
    })
    .select("id")
    .maybeSingle();
  if (error || !affiliation || typeof affiliation !== "object") {
    // Race on the globally-unique normalized email → generic guidance.
    return okResponse({
      started: true,
      guidance:
        "If this address is already linked, use account recovery. Otherwise retry.",
    });
  }
  const affiliationId = (affiliation as { id: string }).id;

  // SIMULATED challenge: real OTP email is blocked until SMTP exists.
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  await client.from("affiliation_challenges").insert({
    affiliation_id: affiliationId,
    code_hash: hashOtpCode(code),
    expires_at: expiresAt,
    attempts: 0,
  });
  const delivery = await sendChallengeEmail({ to: email });

  return okResponse({
    started: true,
    affiliation_id: affiliationId,
    review_required: !domainApproved,
    challenge: {
      expires_in_minutes: 15,
      simulated: delivery.simulated,
    },
  });
}
