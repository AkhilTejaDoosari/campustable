import type { NextRequest } from "next/server";
import {
  deniedMessage,
  errorResponse,
  okResponse,
} from "@/lib/errors";
import {
  acceptRequestTransactionally,
  fetchProject,
  fetchProjectRole,
  fetchRequest,
  fetchVerifiedUniversityIds,
  isEligibleForLocalProject,
} from "@/lib/operations";
import {
  createClient,
  getSessionUser,
  supabaseEnvMissingMessage,
} from "@/lib/supabase-server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/requests/[id]/accept — owner accepts.
 * Acceptance is transactional via the `accept_collaboration_request` RPC
 * (capacity + membership + conversation atomically); concurrent fills
 * surface as `conflict` with no duplicate membership.
 */
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
  if (!reqRow || reqRow.to_user_id !== user.id) {
    return errorResponse("unavailable", deniedMessage());
  }
  if (reqRow.status === "accepted") return okResponse({ request: reqRow });
  if (reqRow.status !== "pending") {
    return errorResponse("conflict", "Only pending requests can be accepted.");
  }

  const project = await fetchProject(client, reqRow.project_id);
  const role = await fetchProjectRole(client, reqRow.role_id);
  if (!project || !role || project.owner_id !== user.id) {
    return errorResponse("unavailable", deniedMessage());
  }
  if (role.status !== "open") {
    return errorResponse("conflict", "This role is no longer open.");
  }
  const verified = await fetchVerifiedUniversityIds(client, reqRow.from_user_id);
  if (
    !isEligibleForLocalProject(project.university_id, project.local_only, verified)
  ) {
    return errorResponse(
      "forbidden",
      "Requester is not eligible for this local-only project.",
    );
  }

  const outcome = await acceptRequestTransactionally(client, reqRow.id);
  if (outcome === "conflict") {
    return errorResponse(
      "conflict",
      "Role filled concurrently. No duplicate membership created.",
    );
  }
  const updated = await fetchRequest(client, reqRow.id);
  return okResponse({ request: updated ?? { ...reqRow, status: "accepted" } });
}
