import { Webhook } from "svix";
import { headers } from "next/headers";
import { syncClerkUser, deleteClerkUser } from "@campustable/auth";

function requireWebhookSecret(): string {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) throw new Error("CLERK_WEBHOOK_SECRET is not configured");
  return secret;
}

export async function POST(req: Request) {
  const payload = await req.text();
  const hdrs = await headers();
  const wh = new Webhook(requireWebhookSecret());
  let evt: { type: string; data: Record<string, unknown> };
  try {
    evt = wh.verify(payload, {
      "svix-id": hdrs.get("svix-id") ?? "",
      "svix-timestamp": hdrs.get("svix-timestamp") ?? "",
      "svix-signature": hdrs.get("svix-signature") ?? "",
    }) as typeof evt;
  } catch {
    return Response.json({ error: "E.INVALID_SIGNATURE" }, { status: 400 });
  }

  try {
    if (evt.type === "user.created" || evt.type === "user.updated") {
      const data = evt.data as {
        id: string;
        email_addresses?: Array<{ id: string; email_address: string }>;
        primary_email_address_id?: string;
      };
      const primary =
        data.email_addresses?.find((e) => e.id === data.primary_email_address_id)?.email_address ??
        data.email_addresses?.[0]?.email_address ??
        "";
      await syncClerkUser({ clerkUserId: data.id, primaryEmail: primary });
    } else if (evt.type === "user.deleted") {
      const data = evt.data as { id?: string };
      if (data.id) await deleteClerkUser(data.id);
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("clerk webhook sync failed", err);
    return Response.json({ error: "E.SYNC_FAILED" }, { status: 500 });
  }
}
