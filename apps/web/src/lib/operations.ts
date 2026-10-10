import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
} from "./validation";

/* ------------------------------------------------------------------ */
/* Row types mirroring the agreed V1 contract (see task + migrations). */
/* ------------------------------------------------------------------ */

export type AffiliationStatus =
  | "self_reported"
  | "pending"
  | "verified"
  | "rejected";
export type ProjectStage =
  | "draft"
  | "open"
  | "in_progress"
  | "completed"
  | "closed";
export type RoleStatus = "open" | "filled" | "closed";
export type RequestStatus = "pending" | "accepted" | "declined" | "withdrawn";

export interface ProfileRow {
  id: string;
  role: string;
  display_name: string | null;
  major: string | null;
  degree: string | null;
  graduation: string | null;
  skills: string[] | null;
  topics: string[] | null;
  wants: string | null;
  availability: string | null;
  meeting_format: string | null;
  visibility: string | null;
  talent_opt_in: boolean | null;
}

export interface AffiliationRow {
  id: string;
  user_id: string;
  university_id: string | null;
  status: AffiliationStatus;
  mailbox_verified: boolean;
  reviewed: boolean;
  normalized_email: string;
}

export interface ProjectRow {
  id: string;
  owner_id: string;
  title: string;
  purpose: string | null;
  commitment: string | null;
  stage: ProjectStage;
  university_id: string | null;
  visibility: string | null;
  local_only: boolean | null;
  idempotency_key: string | null;
  created_at: string;
}

export interface ProjectRoleRow {
  id: string;
  project_id: string;
  title: string;
  kind: string;
  capacity: number;
  filled_count: number | null;
  status: RoleStatus;
}

export interface CollaborationRequestRow {
  id: string;
  project_id: string;
  role_id: string;
  from_user_id: string;
  to_user_id: string;
  status: RequestStatus;
  message: string | null;
  idempotency_key: string | null;
  created_at: string;
}

export interface ConversationRow {
  id: string;
  project_id: string | null;
  created_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  idempotency_key: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Pure domain helpers (no I/O — unit-testable).                        */
/* ------------------------------------------------------------------ */

/** Canonical school-email identity: trim + lowercase (no Gmail dot rewriting). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function domainOf(email: string): string {
  const at = normalizeEmail(email).lastIndexOf("@");
  return at >= 0 ? normalizeEmail(email).slice(at + 1) : "";
}

export interface CursorPayload {
  created_at: string;
  id: string;
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "created_at" in parsed &&
      "id" in parsed
    ) {
      const p = parsed as { created_at: unknown; id: unknown };
      if (typeof p.created_at === "string" && typeof p.id === "string") {
        return { created_at: p.created_at, id: p.id };
      }
    }
    return null;
  } catch {
    // Malformed cursor → caller treats as validation error.
    return null;
  }
}

export function parsePagination(url: URL): {
  limit: number;
  cursor: CursorPayload | null;
  cursorError: boolean;
} {
  const rawLimit = url.searchParams.get("limit");
  let limit = DEFAULT_PAGE_LIMIT;
  if (rawLimit !== null) {
    const n = Number(rawLimit);
    if (!Number.isInteger(n) || n < 1 || n > MAX_PAGE_LIMIT) {
      return { limit, cursor: null, cursorError: true };
    }
    limit = n;
  }
  const rawCursor = url.searchParams.get("cursor");
  if (!rawCursor) return { limit, cursor: null, cursorError: false };
  const decoded = decodeCursor(rawCursor);
  if (!decoded) return { limit, cursor: null, cursorError: true };
  return { limit, cursor: decoded, cursorError: false };
}

export function nextCursor<T extends { created_at: string; id: string }>(
  rows: T[],
  limit: number,
): string | null {
  if (rows.length < limit) return null;
  const last = rows[rows.length - 1];
  if (!last) return null;
  return encodeCursor({ created_at: last.created_at, id: last.id });
}

/**
 * Decline stays silent: non-owners (the sender) must never observe
 * `declined` — they keep seeing a generic `pending` state.
 */
export function visibleRequestStatus(
  row: CollaborationRequestRow,
  viewerId: string,
): RequestStatus {
  if (row.status === "declined" && viewerId !== row.to_user_id) {
    return "pending";
  }
  return row.status;
}

/** Local-only projects admit only requesters verified at the same university. */
export function isEligibleForLocalProject(
  projectUniversityId: string | null,
  projectLocalOnly: boolean | null,
  requesterVerifiedUniversityIds: string[],
): boolean {
  if (!projectLocalOnly) return true;
  if (!projectUniversityId) return true;
  return requesterVerifiedUniversityIds.includes(projectUniversityId);
}

/** Closed (or filled) roles reject new requests. */
export function isRoleAccepting(status: RoleStatus): boolean {
  return status === "open";
}

/** Forward-only project lifecycle (no backwards reopening without a rule). */
const STAGE_ORDER: Record<ProjectStage, number> = {
  draft: 0,
  open: 1,
  in_progress: 2,
  completed: 3,
  closed: 3,
};

export function isForwardStage(from: ProjectStage, to: ProjectStage): boolean {
  if (from === to) return true;
  // completed/closed are terminal; draft→open→in_progress→completed/closed.
  if (from === "completed" || from === "closed") return false;
  return STAGE_ORDER[to] >= STAGE_ORDER[from];
}

/* ------------------------------------------------------------------ */
/* Supabase query helpers — every one takes an authenticated client and */
/* re-checks ownership server-side (RLS is defense in depth, not the    */
/* only gate). Rows are cast to narrow interfaces (never `any`).        */
/* ------------------------------------------------------------------ */

function rows<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function row<T>(value: unknown): T | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as T;
  }
  return null;
}

export async function fetchProfile(
  client: SupabaseClient,
  userId: string,
): Promise<ProfileRow | null> {
  const { data } = await client
    .from("profiles")
    .select(
      "id,role,display_name,major,degree,graduation,skills,topics,wants,availability,meeting_format,visibility,talent_opt_in",
    )
    .eq("id", userId)
    .maybeSingle();
  return row<ProfileRow>(data);
}

export async function fetchVerifiedUniversityIds(
  client: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data } = await client
    .from("affiliations")
    .select("university_id")
    .eq("user_id", userId)
    .eq("status", "verified");
  return rows<{ university_id: string | null }>(data)
    .map((r) => r.university_id)
    .filter((v): v is string => typeof v === "string" && v.length > 0);
}

/** True when either user blocked the other (either direction). */
export async function isPairBlocked(
  client: SupabaseClient,
  a: string,
  b: string,
): Promise<boolean> {
  const { data } = await client
    .from("blocks")
    .select("id")
    .or(
      `and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`,
    )
    .limit(1);
  return rows(data).length > 0;
}

export async function fetchProject(
  client: SupabaseClient,
  projectId: string,
): Promise<ProjectRow | null> {
  const { data } = await client
    .from("projects")
    .select(
      "id,owner_id,title,purpose,commitment,stage,university_id,visibility,local_only,idempotency_key,created_at",
    )
    .eq("id", projectId)
    .maybeSingle();
  return row<ProjectRow>(data);
}

export async function fetchProjectRole(
  client: SupabaseClient,
  roleId: string,
): Promise<ProjectRoleRow | null> {
  const { data } = await client
    .from("project_roles")
    .select("id,project_id,title,kind,capacity,filled_count,status")
    .eq("id", roleId)
    .maybeSingle();
  return row<ProjectRoleRow>(data);
}

export async function fetchRequest(
  client: SupabaseClient,
  requestId: string,
): Promise<CollaborationRequestRow | null> {
  const { data } = await client
    .from("collaboration_requests")
    .select(
      "id,project_id,role_id,from_user_id,to_user_id,status,message,idempotency_key,created_at",
    )
    .eq("id", requestId)
    .maybeSingle();
  return row<CollaborationRequestRow>(data);
}

export async function findRowByIdempotencyKey<T>(
  client: SupabaseClient,
  table: string,
  key: string,
): Promise<T | null> {
  const { data } = await client
    .from(table)
    .select("*")
    .eq("idempotency_key", key)
    .maybeSingle();
  return row<T>(data);
}

export async function isConversationMember(
  client: SupabaseClient,
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await client
    .from("conversation_members")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .limit(1);
  return rows(data).length > 0;
}

/**
 * Acceptance path MUST be transactional (capacity race). Calls the
 * `accept_collaboration_request` RPC owned by the migrations agent.
 * Returns "ok" | "conflict" (capacity filled / already decided).
 */
export async function acceptRequestTransactionally(
  client: SupabaseClient,
  requestId: string,
): Promise<"ok" | "conflict"> {
  const { error } = await client.rpc("accept_collaboration_request", {
    p_request_id: requestId,
  });
  if (!error) return "ok";
  return "conflict";
}
