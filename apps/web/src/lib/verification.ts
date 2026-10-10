import { createHash, randomInt, timingSafeEqual } from "node:crypto";

/**
 * University mailbox OTP helpers.
 *
 * SIMULATED DELIVERY: `sendChallengeEmail()` below only logs to the server
 * console and returns `{ simulated: true }`. Live university verification is
 * BLOCKED until real SMTP credentials / transactional email transport exist
 * (see docs/API.md). Never treat a simulated challenge as real verification,
 * and never log OTP codes or email contents in production.
 */

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 15 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;

export function generateOtpCode(): string {
  let code = "";
  for (let i = 0; i < OTP_LENGTH; i += 1) {
    code += String(randomInt(0, 10));
  }
  return code;
}

export function hashOtpCode(code: string): string {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

/** Timing-safe comparison of a candidate code against the stored sha256 hex. */
export function verifyOtpCode(candidate: string, storedHashHex: string): boolean {
  const candidateHash = hashOtpCode(candidate);
  const a = Buffer.from(candidateHash, "hex");
  const b = Buffer.from(storedHashHex, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function otpExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + OTP_TTL_MS);
}

export function isOtpExpired(expiresAt: Date | string, now: Date = new Date()): boolean {
  return new Date(expiresAt).getTime() <= now.getTime();
}

export function canAttemptOtp(attempts: number): boolean {
  return attempts < OTP_MAX_ATTEMPTS;
}

export interface ChallengeEmailInput {
  to: string;
  universityName?: string;
}

/**
 * SIMULATED email delivery stub.
 * TODO(smtp): wire a real transactional transport using server-only SMTP
 * credentials; until then every challenge stays simulated and live
 * university verification must remain unavailable.
 */
export async function sendChallengeEmail(
  input: ChallengeEmailInput,
): Promise<{ simulated: true }> {
  console.log(
    `[verification] SIMULATED challenge email to domain of ${input.to} — configure SMTP transport before live use.`,
  );
  return { simulated: true };
}
