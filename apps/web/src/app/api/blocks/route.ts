import type { NextRequest } from "next/server";
import { errorResponse, okResponse } from "@/lib/errors";
import {
  createClient,
  getSessionUser,
  supabaseEnvMissingMessage,
} from "@/lib/supabase-server";
import {
  blockCreateSchema,
  formatZodIssues,
} from "@/lib/validation";

/** GET /api/blocks — users I blocked. */
export async function GET(): Promise<Response> {
  const client = await createClient();
  if (!client) {
    return errorResponse(
      "dependency_unavailable",
      supabaseEnvMissingMessage(),
    );
  }
  const user = await getSessionUser(client);
  if (!user) return errorResponse("unauthenticated", "Sign in required.");

  const { data } = await client
    .from("blocks")
    .select("id,blocker_id,blocked_id,reason,created_at")
    .eq("blocker_id", user.id)
    .order("created_at", { ascending: false });
  return okResponse({ blocks: Array.isArray(data) ? data : [] });
}

/** POST /api/blocks — block enforced server-side (contact checks read it). */
export async function POST(req: NextRequest): Promise<Response> {
  const client = await createClient();
  if (!client) {
    return errorResponse(
      "dependency_unavailable",
      supabaseEnvMissingMessage(),
    );
  }
  const user = await getSessionUser(client);
  if (!user) return errorResponse("unauthenticated", "Sign in required.");

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return errorResponse("validation", "Invalid JSON body.");
  }
  const parsed = blockCreateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "validation",
      "Invalid block input.",
      formatZodIssues(parsed.error),
    );
  }
  if (parsed.data.blocked_user_id === user.id) {
    return errorResponse("validation", "Cannot block yourself.");
  }

  const { data: existing } = await client
    .from("blocks")
    .select("id,blocker_id,blocked_id,reason,created_at")
    .eq("blocker_id", user.id)
    .eq("blocked_id", parsed.data.blocked_user_id)
    .maybeSingle();
  if (existing && typeof existing === "object") {
    return okResponse({ block: existing }, 200);
  }

  const { data, error } = await client
    .from("blocks")
    .insert({
      blocker_id: user.id,
      blocked_id: parsed.data.blocked_user_id,
      reason: parsed.data.reason ?? null,
    })
    .select("id,blocker_id,blocked_id,reason,created_at")
    .maybeSingle();
  if (error || !data) {
    return errorResponse("unavailable", "Could not create block. Retry.");
  }
  return okResponse({ block: data }, 201);
}
