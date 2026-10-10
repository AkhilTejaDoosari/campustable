import type { NextRequest } from "next/server";
import {
  deniedMessage,
  errorResponse,
  okResponse,
} from "@/lib/errors";
import { fetchRequest } from "@/lib/operations";
import {
  createClient,
  getSessionUser,
  supabaseEnvMissingMessage,
} from "@/lib/supabase-server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** POST /api/requests/[id]/withdraw — sender retracts a pending request. */
export async function POST(
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

  const reqRow = await fetchRequest(client, id);
  if (!reqRow || reqRow.from_user_id !== user.id) {
    return errorResponse("unavailable", deniedMessage());
  }
  if (reqRow.status === "withdrawn") return okResponse({ request: reqRow });
  if (reqRow.status !== "pending") {
    return errorResponse("conflict", "Only pending requests can be withdrawn.");
  }

  const { data, error } = await client
    .from("collaboration_requests")
    .update({ status: "withdrawn" })
    .eq("id", reqRow.id)
    .eq("from_user_id", user.id)
    .select(
      "id,project_id,role_id,from_user_id,to_user_id,status,message,idempotency_key,created_at",
    )
    .maybeSingle();
  if (error || !data) return errorResponse("unavailable", deniedMessage());
  return okResponse({ request: data });
}
