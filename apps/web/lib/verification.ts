import { createHash, randomInt } from "node:crypto";
import { getAdminClient } from "@campustable/db";
import { getEmailService } from "@/lib/email";

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_SECONDS = 60;

/** Database interface for verification operations. Allows test injection. */
export interface VerificationDatabase {
  getUserByClerkId(clerkUserId: string): Promise<{ id: string; role: string } | null>;
  getUserById(userId: string): Promise<{ id: string } | null>;
  getStudentAffiliation(userId: string, schoolEmail: string): Promise<{ id: string } | null>;
  createStudentAffiliation(userId: string, schoolEmail: string): Promise<{ error: Error | null }>;
  getRecentChallenge(userId: string, schoolEmail: string, since: string): Promise<{ id: string } | null>;
  createChallenge(userId: string, schoolEmail: string, codeHash: string, expiresAt: string): Promise<{ error: Error | null }>;
  getActiveChallenge(userId: string, schoolEmail: string): Promise<Challenge | null>;
  incrementChallengeAttempts(challengeId: string, attempts: number): Promise<void>;
  consumeChallenge(challengeId: string, userId: string, schoolEmail: string): Promise<{ error: Error | null }>;
  advanceOnboardingToProfile(userId: string): Promise<void>;
}

export interface Challenge {
  id: string;
  code_hash: string;
  expires_at: string;
  attempts: number;
  consumed_at: string | null;
}

/** Default production implementation using Supabase admin client. */
export class SupabaseVerificationDatabase implements VerificationDatabase {
  private supabase = getAdminClient();

  async getUserByClerkId(clerkUserId: string) {
    const { data } = await this.supabase
      .from("users")
      .select("id, role")
      .eq("clerk_user_id", clerkUserId)
      .single();
    return data ?? null;
  }

  async getUserById(userId: string) {
    const { data } = await this.supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();
    return data ?? null;
  }

  async getStudentAffiliation(userId: string, schoolEmail: string) {
    const { data } = await this.supabase
      .from("university_affiliations")
      .select("id")
      .eq("user_id", userId)
      .eq("school_email", schoolEmail)
      .limit(1);
    return data?.[0] ?? null;
  }

  async createStudentAffiliation(userId: string, schoolEmail: string) {
    const { error } = await this.supabase.from("university_affiliations").insert({
      user_id: userId,
      role: "student",
      school_email: schoolEmail,
      mailbox_status: "pending",
    });
    return { error };
  }

  async getRecentChallenge(userId: string, schoolEmail: string, since: string) {
    const { data } = await this.supabase
      .from("verification_challenges")
      .select("id")
      .eq("user_id", userId)
      .eq("school_email", schoolEmail)
      .eq("purpose", "university_verification")
      .gte("created_at", since)
      .limit(1);
    return data?.[0] ?? null;
  }

  async createChallenge(userId: string, schoolEmail: string, codeHash: string, expiresAt: string) {
    const { error } = await this.supabase.from("verification_challenges").insert({
      user_id: userId,
      school_email: schoolEmail,
      purpose: "university_verification",
      code_hash: codeHash,
      expires_at: expiresAt,
    });
    return { error };
  }

  async getActiveChallenge(userId: string, schoolEmail: string) {
    const { data } = await this.supabase
      .from("verification_challenges")
      .select("id, code_hash, expires_at, attempts, consumed_at")
      .eq("user_id", userId)
      .eq("school_email", schoolEmail)
      .eq("purpose", "university_verification")
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    return data?.[0] ?? null;
  }

  async incrementChallengeAttempts(challengeId: string, attempts: number) {
    await this.supabase
      .from("verification_challenges")
      .update({ attempts })
      .eq("id", challengeId);
  }

  async consumeChallenge(challengeId: string, userId: string, schoolEmail: string) {
    const { error } = await this.supabase.rpc("consume_verification_challenge", {
      p_challenge_id: challengeId,
      p_user_id: userId,
      p_school_email: schoolEmail,
    });
    return { error };
  }

  async advanceOnboardingToProfile(userId: string) {
    await this.supabase
      .from("users")
      .update({ onboarding_state: "profile", updated_at: new Date().toISOString() })
      .eq("id", userId)
      .eq("onboarding_state", "affiliation");
  }
}

/** Singleton instance for production use. */
let dbInstance: VerificationDatabase | null = null;

function getDatabase(): VerificationDatabase {
  if (!dbInstance) {
    dbInstance = new SupabaseVerificationDatabase();
  }
  return dbInstance;
}

/** Allow test injection of a mock database. */
export function setVerificationDatabase(db: VerificationDatabase) {
  dbInstance = db;
}

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
  const db = getDatabase();
  const user = await db.getUserByClerkId(clerkUserId);
  if (!user) return { ok: false as const, error: "E.NO_LOCAL_USER" };

  // Student affiliations require a school_email (DB check constraint), so the
  // pending row is created here at request time; confirm flips it to verified.
  if (user.role === "student") {
    const existing = await db.getStudentAffiliation(user.id, email);
    if (!existing) {
      const { error: affError } = await db.createStudentAffiliation(user.id, email);
      if (affError) return { ok: false as const, error: "E.AFFILIATION_CREATE_FAILED" };
    }
  }

  const since = new Date(Date.now() - OTP_RESEND_SECONDS * 1000).toISOString();
  const recent = await db.getRecentChallenge(user.id, email, since);
  if (recent) return { ok: false as const, error: "E.RESEND_THROTTLED" };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();
  const { error } = await db.createChallenge(user.id, email, hashOtp(code, email), expiresAt);
  if (error) return { ok: false as const, error: "E.CHALLENGE_CREATE_FAILED" };

  const mailer = getEmailService();
  const sent = await mailer.sendVerificationCode(email, code);
  if (!sent.ok) return { ok: false as const, error: "E.DELIVERY_FAILED" };
  return { ok: true as const };
}

export async function confirmVerification(clerkUserId: string, schoolEmail: string, code: string) {
  const email = normalizeEmail(schoolEmail);
  const db = getDatabase();
  const user = await db.getUserById(clerkUserId);
  if (!user) return { ok: false as const, error: "E.NO_LOCAL_USER" };

  const challenge = await db.getActiveChallenge(user.id, email);
  if (!challenge) return { ok: false as const, error: "E.NO_ACTIVE_CHALLENGE" };
  if (new Date(challenge.expires_at).getTime() < Date.now())
    return { ok: false as const, error: "E.CODE_EXPIRED" };
  if (challenge.attempts >= OTP_MAX_ATTEMPTS)
    return { ok: false as const, error: "E.ATTEMPTS_EXHAUSTED" };

  if (challenge.code_hash !== hashOtp(code, email)) {
    await db.incrementChallengeAttempts(challenge.id, challenge.attempts + 1);
    return { ok: false as const, error: "E.INVALID_CODE" };
  }

  // Single-use: consume + upsert verified affiliation atomically via RPC.
  const { error } = await db.consumeChallenge(challenge.id, user.id, email);
  if (error) return { ok: false as const, error: "E.CONSUME_FAILED" };
  await db.advanceOnboardingToProfile(user.id);
  return { ok: true as const };
}