interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

/**
 * In-memory sliding-window rate guard.
 *
 * TODO(shared-store): replace with a persistent shared enforcement backend
 * (e.g. Redis / Upstash / Postgres advisory counters) before production.
 * Per-process memory does NOT coordinate across instances — per SECURITY.md
 * this is a development guard only.
 */
export function checkRateLimit(
  key: string,
  opts?: { limit?: number; windowMs?: number },
): { allowed: boolean; retryAfterMs: number } {
  const limit = opts?.limit ?? 20;
  const windowMs = opts?.windowMs ?? 60_000;
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0] ?? now;
    buckets.set(key, bucket);
    return { allowed: false, retryAfterMs: Math.max(0, windowMs - (now - oldest)) };
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { allowed: true, retryAfterMs: 0 };
}

/** Narrower guard for OTP verify attempts (bounded attempts + rate limit). */
export function checkOtpRateLimit(identity: string): {
  allowed: boolean;
  retryAfterMs: number;
} {
  return checkRateLimit(`otp:${identity}`, { limit: 10, windowMs: 10 * 60_000 });
}
