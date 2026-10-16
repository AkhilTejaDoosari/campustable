import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getAdminClient } from "@campustable/db";
import { buildObjectKey, validateUpload } from "@campustable/storage";

const Body = z.object({
  kind: z.enum(["resume", "avatar"]),
  fileName: z.string().min(1).max(120),
  mime: z.string().min(1).max(100),
  bytes: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "E.UNAUTHENTICATED" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "E.INVALID_MIME" }, { status: 400 });
  const check = validateUpload(parsed.data);
  if (!check.ok) return Response.json({ error: check.error }, { status: 400 });

  const supabase = getAdminClient();
  const { data: local } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();
  if (!local) return Response.json({ error: "E.NO_LOCAL_USER" }, { status: 403 });

  const bucket = parsed.data.kind === "resume" ? "resumes" : "avatars";
  const objectKey = buildObjectKey(local.id, parsed.data.fileName);
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(objectKey);
  if (error || !data) return Response.json({ error: "E.CONSUME_FAILED" }, { status: 500 });

  await supabase.from("file_records").insert({
    owner_id: local.id,
    bucket,
    object_key: objectKey,
    mime: parsed.data.mime,
    bytes: parsed.data.bytes,
  });
  return Response.json({ ok: true, bucket, objectKey, token: data.token, path: data.path });
}
