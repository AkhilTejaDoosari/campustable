export const RESUME_BUCKET = "resumes";
export const AVATAR_BUCKET = "avatars";

export const RESUME_ALLOWED_MIME = ["application/pdf"] as const;
export const RESUME_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export function buildObjectKey(ownerId: string, originalName: string): string {
  const safe = originalName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .slice(0, 80);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${ownerId}/${rand}-${safe || "file"}`;
}

export function validateUpload(input: { mime: string; bytes: number; kind: "resume" | "avatar" }): {
  ok: boolean;
  error?: string;
} {
  const allowed = input.kind === "resume" ? RESUME_ALLOWED_MIME : AVATAR_ALLOWED_MIME;
  const max = input.kind === "resume" ? RESUME_MAX_BYTES : AVATAR_MAX_BYTES;
  if (!(allowed as readonly string[]).includes(input.mime))
    return { ok: false, error: "E.INVALID_MIME" };
  if (input.bytes <= 0 || input.bytes > max) return { ok: false, error: "E.FILE_TOO_LARGE" };
  return { ok: true };
}
