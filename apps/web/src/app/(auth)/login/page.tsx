"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/components/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error" | "demo">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const result = await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ email }) });
    if ("error" in result) {
      setStatus("demo");
      return;
    }
    router.push("/onboarding");
  }

  return (
    <section className="mx-auto max-w-md space-y-4" aria-labelledby="login-heading">
      <Card>
        <CardHeader>
          <CardTitle id="login-heading">Welcome back</CardTitle>
          <CardDescription>Sign in with your university email. We send a one-time link — no passwords.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">University email</Label>
              <Input id="email" type="email" required autoComplete="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
              <p className="text-xs text-[#786989]">Mailbox access proves enrollment. Self-reported details are labeled as such.</p>
            </div>
            {status === "demo" ? (
              <p role="status" className="rounded-lg bg-[#f2eafe] p-3 text-sm text-[#301544]">
                Demo mode — no email was sent. Continue to explore with fictional sample data.
              </p>
            ) : null}
            {status === "error" ? (
              <p role="alert" className="text-sm text-[#9e353c]">
                Could not send the link. Check the address and try again.
              </p>
            ) : null}
            <Button type="submit" className="w-full bg-[#7541e9] text-white hover:bg-[#602cce]" disabled={status === "sending"}>
              {status === "sending" ? "Sending link…" : "Send sign-in link"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
