import type { NextRequest } from "next/server";
import {
  deniedMessage,
  errorResponse,
  okResponse,
} from "@/lib/errors";
import type { ProjectRoleRow } from "@/lib/operations";
import {
  fetchProject,
  fetchVerifiedUniversityIds,
} from "@/lib/operations";
import {
  createClient,
  getSessionUser,
  supabaseEnvMissingMessage,
} from "@/lib/supabase-server";
import {
  formatZodIssues,
  projectUpdateSchema,
} from "@/lib/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function canSeePrivate(
  client: Parameters<typeof fetchVerifiedUniversityIds>[0],
  project: NonNullable<Awaited<ReturnType<typeof fetchProject>>>,
  userId: string,
): Promise<boolean> {
  if (project.owner_id === userId) return true;
  if (project.visibility === "public" || !project.visibility) return true;
  if (project.visibility === "university") {
    if (project.university_id === null) return true;
    const verified = await fetchVerifiedUniversityIds(client, userId);
    return verified.includes(project.university_id);
  }
  const { data } = await client
    .from("project_memberships")
    .select("id")
    .eq("project_id", project.id)
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1);
  return Array.isArray(data) && data.length > 0;
}

export async function GET(
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
  if (!project) return errorResponse("unavailable", deniedMessage());
  if (!(await canSeePrivate(client, project, user.id))) {
    return errorResponse("unavailable", deniedMessage());
  }
  const { data: roles } = await client
    .from("project_roles")
    .select("id,project_id,title,kind,capacity,filled_count,status")
    .eq("project_id", project.id);
  return okResponse({
    project,
    roles: (Array.isArray(roles) ? roles : []) as ProjectRoleRow[],
  });
}

export async function PATCH(
  req: NextRequest,
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

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return errorResponse("validation", "Invalid JSON body.");
  }
  const parsed = projectUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "validation",
      "Invalid project input.",
      formatZodIssues(parsed.error),
    );
  }

  const project = await fetchProject(client, id);
  if (!project || project.owner_id !== user.id) {
    return errorResponse("unavailable", deniedMessage());
  }
  if (project.stage === "completed" || project.stage === "closed") {
    return errorResponse("conflict", "Completed or closed projects cannot be edited.");
  }

  const { data, error } = await client
    .from("projects")
    .update(parsed.data)
    .eq("id", project.id)
    .eq("owner_id", user.id)
    .select(
      "id,owner_id,title,purpose,commitment,stage,university_id,visibility,local_only,idempotency_key,created_at",
    )
    .maybeSingle();
  if (error || !data || typeof data !== "object") {
    return errorResponse("unavailable", deniedMessage());
  }
  return okResponse({ project: data });
}
