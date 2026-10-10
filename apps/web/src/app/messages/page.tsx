"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/state-cards";
import { apiFetch } from "@/components/api-client";

interface Msg {
  from: string;
  text: string;
}

const SEED_THREADS = [
  {
    id: "t-nia",
    name: "Nia Brooks",
    messages: [
      { from: "nia", text: "Happy to review your plan — what is the first milestone?" },
      { from: "you", text: "A map prototype with 10 test locations. Could you review the scope?" },
    ] as Msg[],
  },
  {
    id: "t-dev",
    name: "Dev Patel",
    messages: [{ from: "dev", text: "Love the dataset idea — want to pair on the first screen?" }] as Msg[],
  },
];

export default function MessagesPage() {
  const [threads, setThreads] = useState(SEED_THREADS);
  const [activeId, setActiveId] = useState(threads[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const [outcome, setOutcome] = useState("");
  const [outcomeType, setOutcomeType] = useState("Learning session");
  const [saved, setSaved] = useState<string | null>(null);

  const active = threads.find((t) => t.id === activeId) ?? threads[0];

  if (!active) {
    return <EmptyState title="Your conversation starts after acceptance." message="Send an introduction, then accept an incoming request or simulate acceptance." actionLabel="Go to requests" actionHref="/requests" />;
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setThreads((prev) => prev.map((t) => (t.id === active.id ? { ...t, messages: [...t.messages, { from: "you", text: draft.trim() }] } : t)));
    setDraft("");
  }

  async function recordOutcome(e: React.FormEvent) {
    e.preventDefault();
    if (!outcome.trim()) return;
    const result = await apiFetch("/api/outcomes", { method: "POST", body: JSON.stringify({ threadId: active.id, type: outcomeType, text: outcome }) });
    if ("error" in result) {
      setSaved(`Recorded (self-reported, simulated): ${outcomeType} — ${outcome.trim()}`);
      setOutcome("");
      return;
    }
    setSaved("Outcome recorded as self-reported.");
    setOutcome("");
  }

  return (
    <section className="space-y-5" aria-labelledby="messages-heading">
      <div>
        <p className="text-[11px] font-bold tracking-[0.18em] text-[#7541e9] uppercase">Build together</p>
        <h1 id="messages-heading" className="mt-1 text-3xl font-extrabold text-[#301544]">From an introduction to real work.</h1>
        <p className="mt-1 text-sm text-[#786989]">Accepted conversations only. Fictional demo threads.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible" role="tablist" aria-label="Conversations">
          {threads.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={t.id === active.id}
              onClick={() => setActiveId(t.id)}
              className={`min-w-[200px] rounded-xl border p-3 text-left lg:min-w-0 ${t.id === active.id ? "border-[#7541e9] bg-[#f2eafe]" : "border-[#e7dcef] bg-white"}`}
            >
              <span className="block text-sm font-bold">{t.name}</span>
              <span className="block text-xs text-[#786989]">Connected · Demo conversation</span>
            </button>
          ))}
        </div>
        <Card>
          <CardContent className="space-y-4 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">{active.name} <span className="ml-1 text-xs font-medium text-[#786989]">Accepted connection</span></h2>
            </div>
            <div className="space-y-2" aria-live="polite" aria-label="Messages">
              {active.messages.map((m, i) => (
                <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.from === "you" ? "ml-auto bg-[#7541e9] text-white" : "bg-[#f2eafe] text-[#301544]"}`}>
                  <span className="block text-[11px] opacity-70">{m.from === "you" ? "You · Demo" : `${active.name} · Demo`}</span>
                  {m.text}
                </div>
              ))}
            </div>
            <form onSubmit={send} className="flex gap-2">
              <Label htmlFor="chat-message" className="sr-only">Your demo message</Label>
              <Textarea id="chat-message" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000} required placeholder="Discuss a goal, next step, or time to collaborate…" className="min-h-11" />
              <Button type="submit" className="bg-[#7541e9] text-white">Send</Button>
            </form>
            <form onSubmit={recordOutcome} className="space-y-2 rounded-xl border border-[#e7dcef] bg-[#fcf9ff] p-3">
              <h3 className="text-sm font-bold">Record a useful interaction <span className="font-medium text-[#786989]">(self-reported)</span></h3>
              <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
                <Select value={outcomeType} onValueChange={(v) => setOutcomeType(v ?? "Learning session")}>
                  <SelectTrigger aria-label="Interaction type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Learning session">Learning session</SelectItem>
                    <SelectItem value="Project contribution">Project contribution</SelectItem>
                    <SelectItem value="Mentoring conversation">Mentoring conversation</SelectItem>
                    <SelectItem value="Work review">Work review</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} maxLength={600} required placeholder="We reviewed the prototype and agreed on two improvements." aria-label="What changed or became possible?" />
              </div>
              <p className="text-xs text-[#786989]">Self-reported demo outcome. This does not award a verified skill badge.</p>
              <Button type="submit" size="sm" variant="secondary">Record demo interaction</Button>
              {saved ? <p role="status" className="text-sm text-green-700">{saved}</p> : null}
            </form>
            <p className="text-xs text-[#786989]">Messages stay in this tab only. No delivery, AI generation, or email notification.</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
