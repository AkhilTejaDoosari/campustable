/** Stable error codes returned by API handlers. Never leak internals. */
export const ERROR_CODES = [
  "E.UNAUTHENTICATED",
  "E.FORBIDDEN",
  "E.INVALID_EMAIL",
  "E.INVALID_CODE",
  "E.NO_LOCAL_USER",
  "E.NO_ACTIVE_CHALLENGE",
  "E.CODE_EXPIRED",
  "E.ATTEMPTS_EXHAUSTED",
  "E.RESEND_THROTTLED",
  "E.DELIVERY_FAILED",
  "E.CHALLENGE_CREATE_FAILED",
  "E.CONSUME_FAILED",
  "E.INVALID_SIGNATURE",
  "E.SYNC_FAILED",
  "E.NOT_FOUND",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export function paginate(page: number, pageSize: number) {
  const p = Math.max(1, Math.floor(page) || 1);
  const s = Math.min(100, Math.max(1, Math.floor(pageSize) || 20));
  return { limit: s, offset: (p - 1) * s, page: p, pageSize: s };
}

/** Idempotency key helper: callers pass `Idempotency-Key` header; validated here. */
export function parseIdempotencyKey(value: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  if (v.length < 8 || v.length > 128) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(v)) return null;
  return v;
}
