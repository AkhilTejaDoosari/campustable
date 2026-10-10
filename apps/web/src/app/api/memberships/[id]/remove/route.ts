import type { NextRequest } from "next/server";
import {
  deniedMessage,
  errorResponse,
  okResponse,
} from "@/lib/errors";
import { fetchProject } from "@/lib/operations";
import {
  createClient,
  getSessionUser,
  supabaseEnvMissingMessage,
} from "@/lib/supabase-server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface MembershipRow {
  id: string;
  project_id: string;
  user_id: string;
  status: string;
}

/** POST /api/memberships/[id]/remove — owner removes a member. */
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

  const { data } = await client
    .from("project_memberships")
    .select("id,project_id,user_id,status")
    .eq("id", id)
    .maybeSingle();
  if (!data || typeof data !== "object") {
    return errorResponse("unavailable", deniedMessage());
  }
  const membership = data as MembershipRow;
  const project = await fetchProject(client, membership.project_id);
  if (!project || project.owner_id !== user.id) {
    return errorResponse("unavailable", deniedMessage());
  }
  if (membership.user_id === user.id) {
    return errorResponse("conflict", "Owner cannot remove themselves.");
  }
  if (membership.status !== "active") return okResponse({ membership });

  const { data: updated, error } = await client
    .from("project_memberships")
    .update({ status: "removed" })
    .eq("id", membership.id)
    .select("id,project_id,user_id,status")
    .maybeSingle();
  if (error || !updated) return errorResponse("unavailable", deniedMessage());
  return okResponse({ membership: updated });
}
