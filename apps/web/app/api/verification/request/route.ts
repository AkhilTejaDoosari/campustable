import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { requestVerification } from "@/lib/verification";

const Body = z.object({ schoolEmail: z.string().email().max(254) });

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "E.UNAUTHENTICATED" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "E.INVALID_EMAIL" }, { status: 400 });
  const result = await requestVerification(userId, parsed.data.schoolEmail);
  if (!result.ok) return Response.json({ error: result.error }, { status: 429 });
  return Response.json({ ok: true });
}
