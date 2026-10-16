/** Funnel events only. Never send profile/resume/mailbox content. */
export const ANALYTICS_EVENTS = {
  signup_completed: "signup_completed",
  onboarding_started: "onboarding_started",
  university_verification_started: "university_verification_started",
  university_verified: "university_verified",
  profile_completed: "profile_completed",
  resume_uploaded: "resume_uploaded",
  recruiter_onboarding_completed: "recruiter_onboarding_completed",
  talent_search_performed: "talent_search_performed",
} as const;

export type AnalyticsEvent = keyof typeof ANALYTICS_EVENTS;

export interface AnalyticsSink {
  track(event: AnalyticsEvent, props?: Record<string, string | number | boolean>): void;
}

const BLOCKED_KEYS = ["email", "resume", "code", "school_email", "content", "token"];

export function sanitizeProps(
  props: Record<string, unknown> = {},
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (BLOCKED_KEYS.includes(k.toLowerCase())) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[k] = v;
  }
  return out;
}

/** Browser helper — the only sanctioned import for product events. */
export async function track(
  event: AnalyticsEvent,
  props: Record<string, unknown> = {},
): Promise<void> {
  try {
    if (typeof window === "undefined") return;
    const mod = (await import("posthog-js")) as unknown as {
      default: { __loaded?: boolean; capture: (e: string, p?: object) => void };
    };
    const client = mod.default;
    if (!client.__loaded) return;
    client.capture(event, sanitizeProps(props));
  } catch {
    // Analytics never breaks product flows.
  }
}
