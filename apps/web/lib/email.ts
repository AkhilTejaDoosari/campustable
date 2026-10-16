import type { EmailService } from "@campustable/email";
import { ConsoleEmailService, ResendEmailService } from "@campustable/email";

let cached: EmailService | null = null;

export function getEmailService(): EmailService {
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY ?? "";
  const from = process.env.EMAIL_FROM ?? "CampusTable <noreply@example.com>";
  cached = apiKey !== "" ? new ResendEmailService(apiKey, from) : new ConsoleEmailService(from);
  return cached;
}
