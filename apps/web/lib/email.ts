import type { EmailService } from "@campustable/email";
import { ConsoleEmailService, ResendEmailService } from "@campustable/email";

let cached: EmailService | null = null;

export function getEmailService(): EmailService {
  if (cached) return cached;
  const isDevelopment = process.env.NODE_ENV !== "production";
  const from = process.env.EMAIL_FROM ?? "CampusTable <noreply@example.com>";

  if (isDevelopment) {
    // Local development: always use console adapter. OTP codes appear only in the
    // local dev server terminal. Never in UI, browser, committed files, or prod logs.
    cached = new ConsoleEmailService(from);
    return cached;
  }

  // Production: fail-closed. Require valid RESEND_API_KEY. Never silently fall back
  // to console when production Resend configuration fails.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "E.EMAIL_NOT_CONFIGURED: RESEND_API_KEY must be set in production. " +
        "Configure a verified sending domain in Resend or email delivery will fail."
    );
  }
  cached = new ResendEmailService(apiKey, from);
  return cached;
}
