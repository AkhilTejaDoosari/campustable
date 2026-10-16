import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { confirmVerification } from "@/lib/verification";

const Body = z.object({
  schoolEmail: z.string().email().max(254),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "E.UNAUTHENTICATED" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "E.INVALID_CODE" }, { status: 400 });
  const result = await confirmVerification(userId, parsed.data.schoolEmail, parsed.data.code);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true });
}
