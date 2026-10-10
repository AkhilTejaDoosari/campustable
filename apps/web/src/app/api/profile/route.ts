import type { NextRequest } from "next/server";
import {
  deniedMessage,
  errorResponse,
  okResponse,
} from "@/lib/errors";
import type { ProfileRow } from "@/lib/operations";
import { fetchProfile } from "@/lib/operations";
import {
  createClient,
  getSessionUser,
  supabaseEnvMissingMessage,
} from "@/lib/supabase-server";
import { formatZodIssues, profileUpdateSchema } from "@/lib/validation";

export async function GET(): Promise<Response> {
  const client = await createClient();
  if (!client) {
    return errorResponse(
      "dependency_unavailable",
      supabaseEnvMissingMessage(),
    );
  }
  const user = await getSessionUser(client);
  if (!user) return errorResponse("unauthenticated", "Sign in required.");
  const profile = await fetchProfile(client, user.id);
  if (!profile) return errorResponse("unavailable", deniedMessage());
  return okResponse({ profile });
}

export async function PATCH(req: NextRequest): Promise<Response> {
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
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "validation",
      "Invalid profile input.",
      formatZodIssues(parsed.error),
    );
  }

  const { data, error } = await client
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id)
    .select(
      "id,role,display_name,major,degree,graduation,skills,topics,wants,availability,meeting_format,visibility,talent_opt_in",
    )
    .maybeSingle();
  if (error || !data || typeof data !== "object") {
    return errorResponse("unavailable", deniedMessage());
  }
  return okResponse({ profile: data as ProfileRow });
}
