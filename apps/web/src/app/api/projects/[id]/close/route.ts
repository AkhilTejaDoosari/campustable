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

/** POST /api/projects/[id]/close — terminal; also closes open roles. */
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

  const project = await fetchProject(client, id);
  if (!project || project.owner_id !== user.id) {
    return errorResponse("unavailable", deniedMessage());
  }
  if (project.stage === "closed" || project.stage === "completed") {
    return okResponse({ project });
  }

  await client
    .from("project_roles")
    .update({ status: "closed" })
    .eq("project_id", project.id)
    .eq("status", "open");

  const { data, error } = await client
    .from("projects")
    .update({ stage: "closed" })
    .eq("id", project.id)
    .eq("owner_id", user.id)
    .select(
      "id,owner_id,title,purpose,commitment,stage,university_id,visibility,local_only,idempotency_key,created_at",
    )
    .maybeSingle();
  if (error || !data) return errorResponse("unavailable", deniedMessage());
  return okResponse({ project: data });
}
