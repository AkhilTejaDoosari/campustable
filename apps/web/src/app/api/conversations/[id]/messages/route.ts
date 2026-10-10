import type { NextRequest } from "next/server";
import {
  deniedMessage,
  errorResponse,
  okResponse,
} from "@/lib/errors";
import { extractIdempotencyKey } from "@/lib/idempotency";
import type { MessageRow } from "@/lib/operations";
import {
  findRowByIdempotencyKey,
  isConversationMember,
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
  messageSendSchema,
} from "@/lib/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/conversations/[id]/messages — member-only history (paginated). */
export async function GET(
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
  if (!(await isConversationMember(client, id, user.id))) {
    return errorResponse("unavailable", deniedMessage());
  }

  const { limit, cursor, cursorError } = parsePagination(req.nextUrl);
  if (cursorError) {
    return errorResponse("validation", "Invalid pagination parameters.");
  }

  let query = client
    .from("messages")
    .select("id,conversation_id,sender_id,body,idempotency_key,created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
    );
  }
  const { data } = await query;
  const all: MessageRow[] = Array.isArray(data) ? (data as MessageRow[]) : [];
  const page = all.slice(0, limit);
  return okResponse({ messages: page, next_cursor: nextCursor(page, limit) });
}

/**
 * POST /api/conversations/[id]/messages — member-only send.
 * Idempotency-Key dedupes retries without duplicate rows.
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
  if (!(await isConversationMember(client, id, user.id))) {
    return errorResponse("unavailable", deniedMessage());
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return errorResponse("validation", "Invalid JSON body.");
  }
  const parsed = messageSendSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "validation",
      "Invalid message input.",
      formatZodIssues(parsed.error),
    );
  }

  const idemKey = extractIdempotencyKey(req.headers);
  if (idemKey) {
    const original = await findRowByIdempotencyKey<MessageRow>(
      client,
      "messages",
      idemKey,
    );
    if (original) return okResponse({ message: original }, 200);
  }

  const { data, error } = await client
    .from("messages")
    .insert({
      conversation_id: id,
      sender_id: user.id,
      body: parsed.data.body,
      idempotency_key: idemKey,
    })
    .select("id,conversation_id,sender_id,body,idempotency_key,created_at")
    .maybeSingle();
  if (error || !data || typeof data !== "object") {
    return errorResponse("unavailable", "Could not send message. Retry.");
  }
  return okResponse({ message: data as MessageRow }, 201);
}
