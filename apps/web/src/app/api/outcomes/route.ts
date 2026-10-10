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
  outcomeCreateSchema,
} from "@/lib/validation";

/**
 * GET /api/outcomes?project_id= — team outcome notes (member/owner only).
 * POST /api/outcomes — record a self-reported outcome (self_report: true).
 */
export async function GET(req: NextRequest): Promise<Response> {
  const client = await createClient();
  if (!client) {
    return errorResponse(
      "dependency_unavailable",
      supabaseEnvMissingMessage(),
    );
  }
  const user = await getSessionUser(client);
  if (!user) return errorResponse("unauthenticated", "Sign in required.");

  const projectId = req.nextUrl.searchParams.get("project_id");
  if (!projectId) {
    return errorResponse("validation", "project_id query parameter required.");
  }
  const project = await fetchProject(client, projectId);
  if (!project) return errorResponse("unavailable", deniedMessage());

  const { data: membership } = await client
    .from("project_memberships")
    .select("id")
    .eq("project_id", project.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1);
  const isMember =
    project.owner_id === user.id ||
    (Array.isArray(membership) && membership.length > 0);
  if (!isMember) return errorResponse("unavailable", deniedMessage());

  const { data } = await client
    .from("outcome_notes")
    .select("id,project_id,author_id,text,self_report,created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });
  return okResponse({ outcomes: Array.isArray(data) ? data : [] });
}

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
  const parsed = outcomeCreateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "validation",
      "Invalid outcome input.",
      formatZodIssues(parsed.error),
    );
  }

  const project = await fetchProject(client, parsed.data.project_id);
  if (!project) return errorResponse("unavailable", deniedMessage());
  const { data: membership } = await client
    .from("project_memberships")
    .select("id")
    .eq("project_id", project.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1);
  const isMember =
    project.owner_id === user.id ||
    (Array.isArray(membership) && membership.length > 0);
  if (!isMember) return errorResponse("unavailable", deniedMessage());

  const { data, error } = await client
    .from("outcome_notes")
    .insert({
      project_id: project.id,
      author_id: user.id,
      text: parsed.data.text,
      self_report: true,
    })
    .select("id,project_id,author_id,text,self_report,created_at")
    .maybeSingle();
  if (error || !data) {
    return errorResponse("unavailable", "Could not record outcome. Retry.");
  }
  return okResponse({ outcome: data }, 201);
}
