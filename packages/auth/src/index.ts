import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type AppRole = "student" | "alumni" | "faculty" | "admin";

export interface LocalUser {
  id: string;
  clerkUserId: string;
  primaryEmail: string;
  role: AppRole;
  onboardingState: string;
}

function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server env is not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

export function toLocalUser(row: {
  id: string;
  clerk_user_id: string;
  primary_email: string;
  role: string;
  onboarding_state: string;
}): LocalUser {
  return {
    id: row.id,
    clerkUserId: row.clerk_user_id,
    primaryEmail: row.primary_email,
    role: (row.role ?? "student") as AppRole,
    onboardingState: row.onboarding_state ?? "started",
  };
}

const USER_COLUMNS = "id, clerk_user_id, primary_email, role, onboarding_state";

/**
 * Idempotent upsert keyed on users.clerk_user_id (UNIQUE). Safe to call from the
 * webhook, app entry, and backfill: concurrent calls converge on one row, existing
 * role/onboarding_state are never overwritten (only email + timestamp are set).
 */
export async function upsertLocalUser(
  client: SupabaseClient,
  input: { clerkUserId: string; primaryEmail: string },
): Promise<LocalUser> {
  const email = input.primaryEmail.trim().toLowerCase();
  if (!email) throw new Error("E.NO_EMAIL");
  const { data, error } = await client
    .from("users")
    .upsert(
      {
        clerk_user_id: input.clerkUserId,
        primary_email: email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "clerk_user_id" },
    )
    .select(USER_COLUMNS)
    .single();
  if (error || !data) throw new Error(`E.UPSERT_FAILED: ${error?.message ?? "no row"}`);
  return toLocalUser(data);
}

/**
 * Returns the Clerk identity + local CampusTable user. Null when signed out.
 * Auto-provisions the local row on first authenticated entry so accounts that
 * predate webhook sync (e.g. early Google signups) self-heal instead of failing.
 */
export async function getCurrentUser(): Promise<LocalUser | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const supabase = adminClient();
  const { data } = await supabase
    .from("users")
    .select(USER_COLUMNS)
    .eq("clerk_user_id", userId)
    .single();
  if (data) return toLocalUser(data);
  const clerk = await currentUser();
  const email = clerk?.primaryEmailAddress?.emailAddress ?? "";
  if (!email) return null;
  return upsertLocalUser(supabase, { clerkUserId: userId, primaryEmail: email });
}

/** Throws 401-style Error when signed out. Use in protected server components/handlers. */
export async function requireUser(): Promise<LocalUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("E.UNAUTHENTICATED");
  return user;
}

/** Role gate. CampusTable owns authorization; Clerk is identity only. */
export async function requireRole(allowed: AppRole[]): Promise<LocalUser> {
  const user = await requireUser();
  if (!allowed.includes(user.role)) throw new Error("E.FORBIDDEN");
  return user;
}

/** Idempotent webhook sync: insert or update local user by clerk_user_id. */
export async function syncClerkUser(input: {
  clerkUserId: string;
  primaryEmail: string;
}): Promise<void> {
  const supabase = adminClient();
  await supabase.from("users").upsert(
    {
      clerk_user_id: input.clerkUserId,
      primary_email: input.primaryEmail.toLowerCase(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "clerk_user_id" },
  );
}

export async function deleteClerkUser(clerkUserId: string): Promise<void> {
  const supabase = adminClient();
  // Retain row for audit/history; mark email tombstone. Hard delete rules ride with Slice 5.
  await supabase
    .from("users")
    .update({
      primary_email: `deleted+${clerkUserId}@example.invalid`,
      updated_at: new Date().toISOString(),
    })
    .eq("clerk_user_id", clerkUserId);
}
