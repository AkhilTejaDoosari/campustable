"use client";

import { Suspense, use, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill, VerificationLabel } from "@/components/status-pill";
import { EmptyState } from "@/components/state-cards";
import { BlockReportDialogs } from "@/components/block-report-dialogs";
import { DEMO_PEOPLE, DEMO_PROJECTS } from "@/components/demo-data";
import { apiFetch } from "@/components/api-client";

export default function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p role="status" aria-live="polite" className="text-sm text-[#786989]">Loading profile…</p>}>
      <PersonDetail params={params} />
    </Suspense>
  );
}

function PersonDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const person = DEMO_PEOPLE.find((p) => p.id === id);
  const [intro, setIntro] = useState("");
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  if (!person) {
    return (
      <div className="space-y-4">
        <EmptyState title="Profile unavailable." message="This fictional profile does not exist in demo mode." actionLabel="Back to people" actionHref="/people" />
      </div>
    );
  }

  const projects = DEMO_PROJECTS.filter((p) => p.owner === person.name);

  async function sendIntro(e: React.FormEvent) {
    e.preventDefault();
    setSendError(null);
    if (!intro.trim()) {
      setSendError("Write one introduction first — a goal, not just a hello.");
      return;
    }
    const result = await apiFetch("/api/requests", { method: "POST", body: JSON.stringify({ to: person?.id, intro }) });
    if ("error" in result) {
      setSent(true); // demo: simulate acceptance path
      return;
    }
    setSent(true);
  }

  return (
    <section className="space-y-5" aria-labelledby="person-heading">
      <Link href="/people" className="text-sm font-semibold text-[#7541e9] hover:underline">← Back to people</Link>
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#e7dcef] bg-white p-6">
            <div className="flex items-center gap-4">
              <span aria-hidden="true" className="grid size-14 place-items-center rounded-full bg-[#7541e9] text-lg font-bold text-white">
                {person.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </span>
              <div>
                <StatusPill status={person.role} />
                <h1 id="person-heading" className="mt-1 text-3xl font-extrabold text-[#301544]">{person.name}</h1>
                <p className="text-sm text-[#786989]">{person.major} · {person.university}</p>
              </div>
            </div>
            <div className="mt-3"><VerificationLabel label={person.verification} demo /></div>
            {person.role === "Faculty" ? (
              <p className="mt-2 text-xs text-[#786989]">Member post — not institutional approval.</p>
            ) : null}
          </div>

          <Card>
            <CardContent className="space-y-3 pt-4">
              <h2 className="font-bold">What brings me here</h2>
              <p className="text-sm">{person.about}</p>
              <h2 className="font-bold">Topics I’m open to discussing</h2>
              <div className="flex flex-wrap gap-1.5">
                {person.skills.map((s) => (
                  <span key={s} className="rounded-full bg-[#f2eafe] px-2 py-0.5 text-xs font-medium">{s}</span>
                ))}
              </div>
              <p className="text-xs text-[#786989]">Skills are self-reported. Sample profiles do not imply verified expertise.</p>
              {person.wants.length > 0 ? (
                <>
                  <h2 className="font-bold">Skills I want to learn</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {person.wants.map((s) => (
                      <span key={s} className="rounded-full bg-[#ffe2d5] px-2 py-0.5 text-xs font-medium">{s}</span>
                    ))}
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 pt-4">
              <h2 className="font-bold">Projects and shared work</h2>
              {projects.length === 0 ? (
                <p className="text-sm text-[#786989]">No shared projects in this fictional profile yet.</p>
              ) : (
                projects.map((p) => (
                  <div key={p.id} className="rounded-xl border border-[#e7dcef] p-3">
                    <p className="font-semibold">{p.title}</p>
                    <p className="text-sm text-[#786989]">{p.stage} · {p.problem}</p>
                    <Link href={`/project/${p.id}`} className="text-sm font-semibold text-[#7541e9] hover:underline">Explore project →</Link>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-3 pt-4">
              <h2 className="font-bold">A reason to connect</h2>
              <p className="text-sm text-[#786989]">{person.availability} · Online or in person</p>
              {sent ? (
                <p role="status" className="rounded-lg bg-[#dff0e5] p-3 text-sm">
                  Introduction sent (simulated). One introduction before acceptance — further messages unlock after acceptance.
                </p>
              ) : (
                <form onSubmit={sendIntro} className="space-y-2">
                  <Label htmlFor="intro">Your introduction *</Label>
                  <Textarea id="intro" required value={intro} onChange={(e) => setIntro(e.target.value)} maxLength={600} placeholder="What would you like to learn, offer, or build together?" />
                  {sendError ? <p role="alert" className="text-sm text-[#9e353c]">{sendError}</p> : null}
                  <Button type="submit" className="w-full bg-[#7541e9] text-white hover:bg-[#602cce]">Introduce yourself ↗</Button>
                  <p className="text-xs text-[#786989]">One introduction before acceptance. A conversation opens only if they accept. Declines are silent and kind.</p>
                </form>
              )}
              <BlockReportDialogs targetId={person.id} targetName={person.name} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
}
