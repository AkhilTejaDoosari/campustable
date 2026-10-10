import type { NextRequest } from "next/server";
import {
  deniedMessage,
  errorResponse,
  okResponse,
} from "@/lib/errors";
import { fetchProject, fetchProjectRole } from "@/lib/operations";
import {
  createClient,
  getSessionUser,
  supabaseEnvMissingMessage,
} from "@/lib/supabase-server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** POST /api/roles/[id]/close — owner closes an open role. */
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

  const role = await fetchProjectRole(client, id);
  if (!role) return errorResponse("unavailable", deniedMessage());
  const project = await fetchProject(client, role.project_id);
  if (!project || project.owner_id !== user.id) {
    return errorResponse("unavailable", deniedMessage());
  }
  if (role.status !== "open") {
    return errorResponse("conflict", "Only open roles can be closed.");
  }

  const { data, error } = await client
    .from("project_roles")
    .update({ status: "closed" })
    .eq("id", role.id)
    .select("id,project_id,title,kind,capacity,filled_count,status")
    .maybeSingle();
  if (error || !data) return errorResponse("unavailable", deniedMessage());
  return okResponse({ role: data });
}
