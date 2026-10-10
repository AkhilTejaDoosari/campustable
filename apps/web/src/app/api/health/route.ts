import { okResponse } from "@/lib/errors";
import { isSupabaseServerConfigured } from "@/lib/supabase-server";

export async function GET(): Promise<Response> {
  const configured = isSupabaseServerConfigured();
  return okResponse({
    ok: true,
    supabase: configured ? "live" : "demo",
    mode: configured
      ? "live"
      : "demo (set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)",
  });
}
