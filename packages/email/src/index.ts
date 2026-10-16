import { Resend } from "resend";

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export interface EmailService {
  sendVerificationCode(to: string, code: string): Promise<SendResult>;
  send(to: string, subject: string, html: string): Promise<SendResult>;
}

export class ResendEmailService implements EmailService {
  private resend: Resend;
  constructor(
    apiKey: string,
    private from: string,
  ) {
    this.resend = new Resend(apiKey);
  }

  async sendVerificationCode(to: string, code: string): Promise<SendResult> {
    return this.send(
      to,
      "Your CampusTable verification code",
      `<p>Your verification code is <strong>${escapeHtml(code)}</strong>. It expires in 10 minutes and can be used once.</p><p>This proves control of this mailbox only — not enrollment.</p>`,
    );
  }

  async send(to: string, subject: string, html: string): Promise<SendResult> {
    try {
      const { data, error } = await this.resend.emails.send({ from: this.from, to, subject, html });
      if (error) return { ok: false, error: error.message };
      return { ok: true, id: data?.id };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "send failed" };
    }
  }
}

/** Development fallback: logs to console. Never reports fake delivery as verified. */
export class ConsoleEmailService implements EmailService {
  constructor(private from: string = "CampusTable <noreply@example.com>") {}
  async sendVerificationCode(to: string, code: string): Promise<SendResult> {
    console.log(`[email:console] from=${this.from} to=${to} code=REDACTED(len=${code.length})`);
    // In non-production this still returns ok so local flows can be exercised;
    // production must configure RESEND_API_KEY (fail-closed in route via env check).
    return { ok: true, id: "console" };
  }
  async send(to: string, subject: string, _html: string): Promise<SendResult> {
    console.log(`[email:console] from=${this.from} to=${to} subject=${subject}`);
    return { ok: true, id: "console" };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
