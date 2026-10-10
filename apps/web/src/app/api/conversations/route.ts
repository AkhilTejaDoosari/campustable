import type { NextRequest } from "next/server";
import { errorResponse, okResponse } from "@/lib/errors";
import type { ConversationRow } from "@/lib/operations";
import { nextCursor, parsePagination } from "@/lib/operations";
import {
  createClient,
  getSessionUser,
  supabaseEnvMissingMessage,
} from "@/lib/supabase-server";

/** GET /api/conversations — conversations I belong to (cursor-paginated). */
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

  const { data: memberRows } = await client
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", user.id);
  const ids: string[] = Array.isArray(memberRows)
    ? (memberRows as Array<{ conversation_id: string }>).map(
        (m) => m.conversation_id,
      )
    : [];
  if (ids.length === 0) return okResponse({ conversations: [], next_cursor: null });

  let query = client
    .from("conversations")
    .select("id,project_id,created_at")
    .in("id", ids)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
    );
  }
  const { data } = await query;
  const all: ConversationRow[] = Array.isArray(data)
    ? (data as ConversationRow[])
    : [];
  const page = all.slice(0, limit);
  return okResponse({
    conversations: page,
    next_cursor: nextCursor(page, limit),
  });
}
