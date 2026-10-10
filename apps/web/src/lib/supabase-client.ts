"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export function isSupabaseBrowserConfigured(): boolean {
  return (
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
    typeof process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.length > 0
  );
}

let browserClient: SupabaseClient | null = null;

/**
 * Browser-side Supabase client (public URL + publishable key only).
 * Never pass service-role credentials here. Returns null when env is
 * missing so pages can render a demo/simulated state instead of crashing.
 */
export function createClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  if (!browserClient) {
    browserClient = createBrowserClient(url, key);
  }
  return browserClient;
}
