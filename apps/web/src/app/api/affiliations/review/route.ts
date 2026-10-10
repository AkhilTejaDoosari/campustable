import type { NextRequest } from "next/server";
import { errorResponse, okResponse } from "@/lib/errors";
import {
  createClient,
  getSessionUser,
  supabaseEnvMissingMessage,
} from "@/lib/supabase-server";
import {
  affiliationReviewSchema,
  formatZodIssues,
} from "@/lib/validation";

/**
 * POST /api/affiliations/review — approve/reject a pending affiliation.
 *
 * Only an already-reviewed, mailbox-verified faculty approver may review
 * (pending faculty can NEVER approve their own or others' access). Sets
 * both `reviewed` and the terminal status; mailbox OTP alone cannot.
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

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return errorResponse("validation", "Invalid JSON body.");
  }
  const parsed = affiliationReviewSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "validation",
      "Invalid review input.",
      formatZodIssues(parsed.error),
    );
  }

  // Approver gate: verified + reviewed faculty affiliation required.
  const { data: approverRows } = await client
    .from("affiliations")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "verified")
    .eq("mailbox_verified", true)
    .eq("reviewed", true)
    .limit(1);
  const { data: approverProfile } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const approverRole =
    approverProfile && typeof approverProfile === "object"
      ? (approverProfile as { role: string }).role
      : "";
  if (
    !Array.isArray(approverRows) ||
    approverRows.length === 0 ||
    approverRole !== "faculty"
  ) {
    return errorResponse("forbidden", "Reviewer access required.");
  }

  const { data: target } = await client
    .from("affiliations")
    .select("id,status")
    .eq("id", parsed.data.affiliation_id)
    .maybeSingle();
  if (!target || typeof target !== "object") {
    return errorResponse("unavailable", "Affiliation not found.");
  }

  const nextStatus = parsed.data.decision === "approve" ? "verified" : "rejected";
  const { data: updated, error } = await client
    .from("affiliations")
    .update({ status: nextStatus, reviewed: true })
    .eq("id", parsed.data.affiliation_id)
    .select("id,status,reviewed")
    .maybeSingle();
  if (error || !updated) {
    return errorResponse("unavailable", "Affiliation not found.");
  }
  return okResponse({ affiliation: updated });
}
