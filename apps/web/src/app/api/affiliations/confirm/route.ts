import type { NextRequest } from "next/server";
import { errorResponse, okResponse } from "@/lib/errors";
import type { AffiliationRow } from "@/lib/operations";
import {
  createClient,
  getSessionUser,
  supabaseEnvMissingMessage,
} from "@/lib/supabase-server";
import {
  affiliationConfirmSchema,
  formatZodIssues,
} from "@/lib/validation";
import { checkOtpRateLimit } from "@/lib/rate-limit";
import {
  OTP_MAX_ATTEMPTS,
  canAttemptOtp,
  isOtpExpired,
  verifyOtpCode,
} from "@/lib/verification";

interface ChallengeRow {
  id: string;
  affiliation_id: string;
  code_hash: string;
  expires_at: string;
  attempts: number;
}

/**
 * POST /api/affiliations/confirm — verify the 6-digit mailbox OTP.
 *
 * Confirm proves mailbox control only (`mailbox_verified`). It NEVER sets
 * `reviewed` and NEVER uses Supabase Auth email-change as verification
 * (per API.md). Faculty stays `pending` until a reviewed approver acts.
 * All failures return the same generic message to avoid oracle attacks.
 */
const GENERIC = "Invalid or expired code. Request a new code and retry.";

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

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return errorResponse("validation", "Invalid JSON body.");
  }
  const parsed = affiliationConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "validation",
      "Invalid confirmation input.",
      formatZodIssues(parsed.error),
    );
  }

  const gate = checkOtpRateLimit(`${user.id}:${parsed.data.affiliation_id}`);
  if (!gate.allowed) {
    return errorResponse("rate_limited", "Too many attempts. Retry shortly.");
  }

  const { data: affData } = await client
    .from("affiliations")
    .select("id,user_id,university_id,status,mailbox_verified,reviewed,normalized_email")
    .eq("id", parsed.data.affiliation_id)
    .maybeSingle();
  if (!affData || typeof affData !== "object") {
    return errorResponse("validation", GENERIC);
  }
  const affiliation = affData as AffiliationRow & { user_id: string };
  if (affiliation.user_id !== user.id) return errorResponse("validation", GENERIC);

  const { data: chData } = await client
    .from("affiliation_challenges")
    .select("id,affiliation_id,code_hash,expires_at,attempts")
    .eq("affiliation_id", affiliation.id)
    .order("id", { ascending: false })
    .limit(1);
  const challenges: ChallengeRow[] = Array.isArray(chData)
    ? (chData as ChallengeRow[])
    : [];
  const challenge = challenges[0];
  if (!challenge) return errorResponse("validation", GENERIC);
  if (isOtpExpired(challenge.expires_at)) {
    return errorResponse("validation", GENERIC);
  }
  if (!canAttemptOtp(challenge.attempts)) {
    return errorResponse(
      "rate_limited",
      `Maximum ${OTP_MAX_ATTEMPTS} attempts reached. Start a new challenge.`,
    );
  }

  if (!verifyOtpCode(parsed.data.code, challenge.code_hash)) {
    await client
      .from("affiliation_challenges")
      .update({ attempts: challenge.attempts + 1 })
      .eq("id", challenge.id);
    return errorResponse("validation", GENERIC);
  }

  // Correct code: mailbox proven. Students/alumni with approved domains
  // become verified; faculty (and unknown domains) stay pending review.
  const nextStatus =
    affiliation.status === "self_reported" ? "self_reported" : "verified";
  // Faculty mailbox proof must NOT auto-verify the role claim.
  const { data: profile } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role =
    profile && typeof profile === "object"
      ? (profile as { role: string }).role
      : "";
  const finalStatus =
    role === "faculty" || affiliation.status === "self_reported"
      ? "pending"
      : nextStatus;

  await client
    .from("affiliations")
    .update({ mailbox_verified: true, status: finalStatus })
    .eq("id", affiliation.id);
  await client.from("affiliation_challenges").delete().eq("id", challenge.id);

  return okResponse({
    confirmed: true,
    affiliation_id: affiliation.id,
    status: finalStatus,
    mailbox_verified: true,
    reviewed: false,
  });
}
