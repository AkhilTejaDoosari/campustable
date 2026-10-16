import { z } from "zod";

const serverSchema = z.object({
  CLERK_SECRET_KEY: z.string().min(1).optional(),
  CLERK_WEBHOOK_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  return serverSchema.parse(source);
}

/** Fail closed when a required secret is absent. Call at server startup for real flows. */
export function requireEnv(
  keys: (keyof ServerEnv)[],
  source: Record<string, string | undefined> = process.env,
): void {
  const missing = keys.filter((k) => !source[k]);
  if (missing.length > 0) throw new Error(`Missing required env: ${missing.join(", ")}`);
}
