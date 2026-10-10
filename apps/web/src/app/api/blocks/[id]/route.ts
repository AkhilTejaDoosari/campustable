import type { NextRequest } from "next/server";
import {
  deniedMessage,
  errorResponse,
  okResponse,
} from "@/lib/errors";
import {
  createClient,
  getSessionUser,
  supabaseEnvMissingMessage,
} from "@/lib/supabase-server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** DELETE /api/blocks/[id] — unblock (blocker only). */
export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext,
): Promise<Response> {
  const { id } = await ctx.params;
  const client = await createClient();
  if (!client) {
    return errorResponse(
      "dependency_unavailable",
      supabaseEnvMissingMessage(),
    );
  }
  const user = await getSessionUser(client);
  if (!user) return errorResponse("unauthenticated", "Sign in required.");

  const { data, error } = await client
    .from("blocks")
    .delete()
    .eq("id", id)
    .eq("blocker_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return errorResponse("unavailable", deniedMessage());
  return okResponse({ unblocked: true });
}
