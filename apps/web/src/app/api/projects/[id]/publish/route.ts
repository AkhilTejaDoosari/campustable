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
import {
  formatZodIssues,
  projectPublishSchema,
} from "@/lib/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/projects/[id]/publish — draft → open.
 * Validates required purpose/commitment fields and at least one open role
 * (existing or supplied). Already-open is idempotent (returns current).
 */
export async function POST(
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
    body = {};
  }
  const parsed = projectPublishSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return errorResponse(
      "validation",
      "Invalid publish input.",
      formatZodIssues(parsed.error),
    );
  }

  const project = await fetchProject(client, id);
  if (!project || project.owner_id !== user.id) {
    return errorResponse("unavailable", deniedMessage());
  }
  if (project.stage === "open" || project.stage === "in_progress") {
    return okResponse({ project });
  }
  if (project.stage !== "draft") {
    return errorResponse("conflict", "Only drafts can be published.");
  }
  if (!project.purpose || !project.commitment) {
    return errorResponse(
      "validation",
      "Purpose and commitment are required before publishing.",
    );
  }

  const { data: existingRoles } = await client
    .from("project_roles")
    .select("id")
    .eq("project_id", project.id)
    .eq("status", "open");
  const existingCount = Array.isArray(existingRoles) ? existingRoles.length : 0;
  const supplied = parsed.data.roles ?? [];
  if (existingCount + supplied.length < 1) {
    return errorResponse(
      "validation",
      "Publish with at least one open contributor/advisor role.",
    );
  }

  if (supplied.length > 0) {
    const { error: roleError } = await client.from("project_roles").insert(
      supplied.map((r) => ({
        project_id: project.id,
        title: r.title,
        kind: r.kind,
        capacity: r.capacity,
        filled_count: 0,
        status: "open",
      })),
    );
    if (roleError) {
      return errorResponse("unavailable", "Could not create roles. Retry.");
    }
  }

  // Owner becomes a member on publish (owner is a member invariant).
  await client.from("project_memberships").upsert(
    {
      project_id: project.id,
      user_id: user.id,
      status: "active",
      role: "owner",
    },
    { onConflict: "project_id,user_id" },
  );

  const { data, error } = await client
    .from("projects")
    .update({ stage: "open" })
    .eq("id", project.id)
    .eq("owner_id", user.id)
    .select(
      "id,owner_id,title,purpose,commitment,stage,university_id,visibility,local_only,idempotency_key,created_at",
    )
    .maybeSingle();
  if (error || !data) return errorResponse("unavailable", deniedMessage());
  return okResponse({ project: data });
}
