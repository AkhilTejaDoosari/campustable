import { randomUUID } from "node:crypto";

/** Header name clients must send for mutation retry safety. */
export const IDEMPOTENCY_HEADER = "idempotency-key";

export function generateIdempotencyKey(): string {
  return randomUUID();
}

export function extractIdempotencyKey(headers: Headers): string | null {
  const raw = headers.get(IDEMPOTENCY_HEADER) ?? headers.get("Idempotency-Key");
  if (!raw) return null;
  const key = raw.trim();
  if (key.length === 0 || key.length > 128) return null;
  return key;
}

/**
 * Builds a row probe for tables carrying an `idempotency_key` unique column
 * (projects, collaboration_requests, messages). Callers query by this key
 * first; a hit means "duplicate delivery — return the original row".
 */
export function idempotencyProbe(table: string, key: string): {
  table: string;
  key: string;
} {
  return { table, key };
}
