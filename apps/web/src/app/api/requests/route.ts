import type { NextRequest } from "next/server";
import { errorResponse, okResponse } from "@/lib/errors";
import { extractIdempotencyKey } from "@/lib/idempotency";
import type { CollaborationRequestRow } from "@/lib/operations";
import {
  fetchProject,
  fetchProjectRole,
  fetchVerifiedUniversityIds,
  findRowByIdempotencyKey,
  isEligibleForLocalProject,
  isPairBlocked,
  isRoleAccepting,
  nextCursor,
  parsePagination,
  visibleRequestStatus,
} from "@/lib/operations";
import {
  createClient,
  getSessionUser,
  supabaseEnvMissingMessage,
} from "@/lib/supabase-server";
import {
  formatZodIssues,
  requestCreateSchema,
} from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/requests — requests I sent or received.
 * Decline stays silent: senders see `declined` mapped to generic `pending`.
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
    .from("collaboration_requests")
    .select(
      "id,project_id,role_id,from_user_id,to_user_id,status,message,idempotency_key,created_at",
    )
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
    );
  }
  const { data } = await query;
  const all: CollaborationRequestRow[] = Array.isArray(data)
    ? (data as CollaborationRequestRow[])
    : [];
  const page = all.slice(0, limit);
  return okResponse({
    requests: page.map((r) => ({
      ...r,
      status: visibleRequestStatus(r, user.id),
    })),
    next_cursor: nextCursor(page, limit),
  });
}

/**
 * POST /api/requests — send an introduction for a project role.
 * Enforces server-side: no self-join, open role, local-only eligibility
 * (verified affiliation university), blocked pairs cannot contact, one
 * pending introduction per account pair (already-connected pairs may apply
 * to further projects without a new introduction).
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

  const gate = checkRateLimit(`req-create:${user.id}`, { limit: 10, windowMs: 60_000 });
  if (!gate.allowed) {
    return errorResponse("rate_limited", "Too many requests. Retry shortly.");
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return errorResponse("validation", "Invalid JSON body.");
  }
  const parsed = requestCreateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "validation",
      "Invalid request input.",
      formatZodIssues(parsed.error),
    );
  }

  const idemKey = extractIdempotencyKey(req.headers);
  if (idemKey) {
    const original = await findRowByIdempotencyKey<CollaborationRequestRow>(
      client,
      "collaboration_requests",
      idemKey,
    );
    if (original) {
      return okResponse(
        {
          request: {
            ...original,
            status: visibleRequestStatus(original, user.id),
          },
        },
        200,
      );
    }
  }

  const project = await fetchProject(client, parsed.data.project_id);
  if (!project || project.stage !== "open") {
    return errorResponse("unavailable", "Project is not accepting requests.");
  }
  if (project.owner_id === user.id) {
    return errorResponse("forbidden", "Cannot request your own project.");
  }
  const role = await fetchProjectRole(client, parsed.data.role_id);
  if (!role || role.project_id !== project.id) {
    return errorResponse("validation", "Role does not belong to this project.");
  }
  if (!isRoleAccepting(role.status)) {
    return errorResponse("conflict", "This role is no longer open.");
  }

  // Local-only eligibility: crafted requests cannot bypass the check.
  const verified = await fetchVerifiedUniversityIds(client, user.id);
  if (
    !isEligibleForLocalProject(project.university_id, project.local_only, verified)
  ) {
    return errorResponse(
      "forbidden",
      "This project is limited to members of its university.",
    );
  }

  if (await isPairBlocked(client, user.id, project.owner_id)) {
    return errorResponse("forbidden", "Cannot contact this user.");
  }

  // One introduction per account pair: a pending request to the same owner
  // blocks another; an accepted (connected) pair may apply to more projects.
  const { data: pairRows } = await client
    .from("collaboration_requests")
    .select("id,project_id,status")
    .eq("from_user_id", user.id)
    .eq("to_user_id", project.owner_id)
    .in("status", ["pending", "accepted"]);
  const pairs: Array<{ project_id: string; status: string }> = Array.isArray(pairRows)
    ? (pairRows as Array<{ project_id: string; status: string }>)
    : [];
  const alreadyConnected = pairs.some((p) => p.status === "accepted");
  const pendingIntro = pairs.some(
    (p) => p.status === "pending" && p.project_id !== project.id,
  );
  if (!alreadyConnected && pendingIntro) {
    return errorResponse(
      "conflict",
      "An introduction with this owner is already pending.",
    );
  }
  const duplicate = pairs.some(
    (p) =>
      p.status === "pending" &&
      p.project_id === project.id,
  );
  if (duplicate) {
    return errorResponse("conflict", "A pending request already exists.");
  }

  const { data, error } = await client
    .from("collaboration_requests")
    .insert({
      project_id: project.id,
      role_id: role.id,
      from_user_id: user.id,
      to_user_id: project.owner_id,
      status: "pending",
      message: parsed.data.message,
      idempotency_key: idemKey,
    })
    .select(
      "id,project_id,role_id,from_user_id,to_user_id,status,message,idempotency_key,created_at",
    )
    .maybeSingle();
  if (error || !data || typeof data !== "object") {
    return errorResponse("unavailable", "Could not send request. Retry.");
  }
  return okResponse({ request: data as CollaborationRequestRow }, 201);
}
