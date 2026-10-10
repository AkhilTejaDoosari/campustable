import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function isSupabaseServerConfigured(): boolean {
  return (
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
    typeof process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.length > 0
  );
}

export function supabaseEnvMissingMessage(): string {
  return "Supabase is not configured (demo mode). Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.";
}

/**
 * Server-side Supabase client for Route Handlers / Server Actions.
 * Uses @supabase/ssr createServerClient with Next.js cookie integration
 * (getAll reads the request cookies; setAll writes refreshed session cookies).
 * Always create a fresh client per request — never share across requests.
 * Returns null when env is missing so routes can answer
 * `dependency_unavailable` instead of crashing.
 */
export async function createClient(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (refreshError) {
          // Route Handlers can set cookies; Server Components cannot.
          // Swallow only the read-only-context failure and log it.
          console.warn("[supabase-server] unable to set cookies", refreshError);
        }
      },
    },
  });
}

/** Session user resolved server-side via Auth server verification. */
export async function getSessionUser(
  client: SupabaseClient | null,
): Promise<User | null> {
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

/** Resolves the authenticated user or returns null when unauthenticated. */
export async function requireSessionUser(): Promise<{
  client: SupabaseClient;
  user: User;
} | null> {
  const client = await createClient();
  if (!client) return null;
  const user = await getSessionUser(client);
  if (!user) return null;
  return { client, user };
}
