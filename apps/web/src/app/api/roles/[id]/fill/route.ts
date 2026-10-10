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

async function loadOwnedRole(
  client: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  roleId: string,
  userId: string,
) {
  const role = await fetchProjectRole(client, roleId);
  if (!role) return null;
  const project = await fetchProject(client, role.project_id);
  if (!project || project.owner_id !== userId) return null;
  return { role, project };
}

/** POST /api/roles/[id]/fill — owner marks an open role filled. */
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

  const owned = await loadOwnedRole(client, id, user.id);
  if (!owned) return errorResponse("unavailable", deniedMessage());
  if (owned.role.status !== "open") {
    return errorResponse("conflict", "Only open roles can be filled.");
  }

  const { data, error } = await client
    .from("project_roles")
    .update({ status: "filled" })
    .eq("id", owned.role.id)
    .select("id,project_id,title,kind,capacity,filled_count,status")
    .maybeSingle();
  if (error || !data) return errorResponse("unavailable", deniedMessage());
  return okResponse({ role: data });
}
