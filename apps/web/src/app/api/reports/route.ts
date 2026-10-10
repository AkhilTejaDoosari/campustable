import type { NextRequest } from "next/server";
import { errorResponse, okResponse } from "@/lib/errors";
import {
  createClient,
  getSessionUser,
  supabaseEnvMissingMessage,
} from "@/lib/supabase-server";
import {
  formatZodIssues,
  reportCreateSchema,
} from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";

/** POST /api/reports — submit a report against a user or project. */
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

  const gate = checkRateLimit(`report:${user.id}`, { limit: 10, windowMs: 60_000 });
  if (!gate.allowed) {
    return errorResponse("rate_limited", "Too many reports. Retry shortly.");
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return errorResponse("validation", "Invalid JSON body.");
  }
  const parsed = reportCreateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "validation",
      "Invalid report input.",
      formatZodIssues(parsed.error),
    );
  }

  const { data, error } = await client
    .from("reports")
    .insert({
      reporter_id: user.id,
      target_user_id: parsed.data.target_user_id ?? null,
      project_id: parsed.data.project_id ?? null,
      reason: parsed.data.reason,
      details: parsed.data.details ?? null,
      status: "open",
    })
    .select("id,status,created_at")
    .maybeSingle();
  if (error || !data) {
    return errorResponse("unavailable", "Could not submit report. Retry.");
  }
  return okResponse({ report: data }, 201);
}
