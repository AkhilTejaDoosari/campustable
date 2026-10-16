import { createHash, randomInt } from "node:crypto";
import { getAdminClient } from "@campustable/db";
import { getEmailService } from "@/lib/email";

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_SECONDS = 60;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashOtp(code: string, email: string): string {
  const pepper = process.env.OTP_PEPPER ?? "dev-only-pepper";
  return createHash("sha256")
    .update(`${pepper}:${normalizeEmail(email)}:${code}`)
    .digest("hex");
}

export async function requestVerification(clerkUserId: string, schoolEmail: string) {
  const email = normalizeEmail(schoolEmail);
  const supabase = getAdminClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, role")
    .eq("clerk_user_id", clerkUserId)
    .single();
  if (!user) return { ok: false as const, error: "E.NO_LOCAL_USER" };

  // Student affiliations require a school_email (DB check constraint), so the
  // pending row is created here at request time; confirm flips it to verified.
  if (user.role === "student") {
    const { data: existing } = await supabase
      .from("university_affiliations")
      .select("id")
      .eq("user_id", user.id)
      .eq("school_email", email)
      .limit(1);
    if (!existing || existing.length === 0) {
      const { error: affError } = await supabase.from("university_affiliations").insert({
        user_id: user.id,
        role: "student",
        school_email: email,
        mailbox_status: "pending",
      });
      if (affError) return { ok: false as const, error: "E.AFFILIATION_CREATE_FAILED" };
    }
  }

  const since = new Date(Date.now() - OTP_RESEND_SECONDS * 1000).toISOString();
  const { data: recent } = await supabase
    .from("verification_challenges")
    .select("id")
    .eq("user_id", user.id)
    .eq("school_email", email)
    .eq("purpose", "university_verification")
    .gte("created_at", since)
    .limit(1);
  if (recent && recent.length > 0) return { ok: false as const, error: "E.RESEND_THROTTLED" };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();
  const { error } = await supabase.from("verification_challenges").insert({
    user_id: user.id,
    school_email: email,
    purpose: "university_verification",
    code_hash: hashOtp(code, email),
    expires_at: expiresAt,
  });
  if (error) return { ok: false as const, error: "E.CHALLENGE_CREATE_FAILED" };

  const mailer = getEmailService();
  const sent = await mailer.sendVerificationCode(email, code);
  if (!sent.ok) return { ok: false as const, error: "E.DELIVERY_FAILED" };
  return { ok: true as const };
}

export async function confirmVerification(clerkUserId: string, schoolEmail: string, code: string) {
  const email = normalizeEmail(schoolEmail);
  const supabase = getAdminClient();
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .single();
  if (!user) return { ok: false as const, error: "E.NO_LOCAL_USER" };

  const { data: challenges } = await supabase
    .from("verification_challenges")
    .select("id, code_hash, expires_at, attempts, consumed_at")
    .eq("user_id", user.id)
    .eq("school_email", email)
    .eq("purpose", "university_verification")
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1);
  const challenge = challenges?.[0];
  if (!challenge) return { ok: false as const, error: "E.NO_ACTIVE_CHALLENGE" };
  if (new Date(challenge.expires_at).getTime() < Date.now())
    return { ok: false as const, error: "E.CODE_EXPIRED" };
  if (challenge.attempts >= OTP_MAX_ATTEMPTS)
    return { ok: false as const, error: "E.ATTEMPTS_EXHAUSTED" };

  if (challenge.code_hash !== hashOtp(code, email)) {
    await supabase
      .from("verification_challenges")
      .update({ attempts: challenge.attempts + 1 })
      .eq("id", challenge.id);
    return { ok: false as const, error: "E.INVALID_CODE" };
  }

  // Single-use: consume + upsert verified affiliation atomically via RPC.
  const { error } = await supabase.rpc("consume_verification_challenge", {
    p_challenge_id: challenge.id,
    p_user_id: user.id,
    p_school_email: email,
  });
  if (error) return { ok: false as const, error: "E.CONSUME_FAILED" };
  await supabase
    .from("users")
    .update({ onboarding_state: "profile", updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .eq("onboarding_state", "affiliation");
  return { ok: true as const };
}
