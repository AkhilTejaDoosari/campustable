import type { NextRequest } from "next/server";
import {
  deniedMessage,
  errorResponse,
  okResponse,
} from "@/lib/errors";
import { extractIdempotencyKey } from "@/lib/idempotency";
import type { ProjectRow } from "@/lib/operations";
import {
  fetchVerifiedUniversityIds,
  findRowByIdempotencyKey,
  nextCursor,
  parsePagination,
} from "@/lib/operations";
import {
  createClient,
  getSessionUser,
  supabaseEnvMissingMessage,
} from "@/lib/supabase-server";
import {
  formatZodIssues,
  projectDraftSchema,
} from "@/lib/validation";

/**
 * GET /api/projects — cursor-paginated discovery (limit default 20, max 50).
 * Anonymous denied: auth required. Visibility enforced server-side —
 * public always; university only with a verified affiliation there
 * (null university_id = all universities); private only for owner/member.
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

  const { limit, cursor, cursorError } = parsePagination(req.nextUrl);
  if (cursorError) {
    return errorResponse("validation", "Invalid pagination parameters.");
  }

  let query = client
    .from("projects")
    .select(
      "id,owner_id,title,purpose,commitment,stage,university_id,visibility,local_only,idempotency_key,created_at",
    )
    .in("stage", ["open", "in_progress"])
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
    );
  }
  const { data, error } = await query;
  if (error) return errorResponse("unavailable", deniedMessage());
  const all: ProjectRow[] = Array.isArray(data) ? (data as ProjectRow[]) : [];
  const page = all.slice(0, limit);

  const verified = await fetchVerifiedUniversityIds(client, user.id);
  const { data: memberships } = await client
    .from("project_memberships")
    .select("project_id")
    .eq("user_id", user.id)
    .eq("status", "active");
  const memberOf = new Set(
    (Array.isArray(memberships)
      ? (memberships as Array<{ project_id: string }>)
      : []
    ).map((m) => m.project_id),
  );

  const visible = page.filter((p) => {
    if (p.owner_id === user.id || memberOf.has(p.id)) return true;
    if (p.visibility === "public" || !p.visibility) return true;
    if (p.visibility === "university") {
      return p.university_id === null || verified.includes(p.university_id);
    }
    return false;
  });

  return okResponse({
    projects: visible,
    next_cursor: nextCursor(page, limit),
  });
}

/**
 * POST /api/projects — save a draft brief. Idempotency-Key supported:
 * a repeated key returns the original draft (201 → 200) without a new row.
 */
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
  const parsed = projectDraftSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "validation",
      "Invalid project input.",
      formatZodIssues(parsed.error),
    );
  }

  const idemKey = extractIdempotencyKey(req.headers);
  if (idemKey) {
    const original = await findRowByIdempotencyKey<ProjectRow>(
      client,
      "projects",
      idemKey,
    );
    if (original) return okResponse({ project: original }, 200);
  }

  const { data, error } = await client
    .from("projects")
    .insert({
      owner_id: user.id,
      title: parsed.data.title,
      purpose: parsed.data.purpose ?? null,
      commitment: parsed.data.commitment ?? null,
      stage: "draft",
      university_id: parsed.data.university_id ?? null,
      visibility: parsed.data.visibility ?? "university",
      local_only: parsed.data.local_only ?? false,
      idempotency_key: idemKey,
    })
    .select(
      "id,owner_id,title,purpose,commitment,stage,university_id,visibility,local_only,idempotency_key,created_at",
    )
    .maybeSingle();
  if (error || !data || typeof data !== "object") {
    return errorResponse("unavailable", "Could not save draft. Retry.");
  }
  return okResponse({ project: data as ProjectRow }, 201);
}
