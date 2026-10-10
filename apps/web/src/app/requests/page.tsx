"use client";

import { useState } from "react";
import Link from "next/link";
import { RequestCard } from "@/components/cards";
import { EmptyState } from "@/components/state-cards";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/components/api-client";

type Tab = "all" | "pending" | "accepted" | "declined" | "withdrawn";

interface DemoRequest {
  id: string;
  name: string;
  context: string;
  status: Exclude<Tab, "all">;
  intro: string;
  outgoing: boolean;
}

const SEED: DemoRequest[] = [
  { id: "r1", name: "Dev Patel", context: "Sent by you · Campus Reuse Map", status: "pending", intro: "Hi Dev — I can help with the data pipeline. Could we try a 30-minute sketch session this week?", outgoing: true },
  { id: "r2", name: "Nia Brooks", context: "Received · Mentoring conversation", status: "accepted", intro: "Happy to review your project plan — send the one-pager and we can talk Thursday.", outgoing: false },
  { id: "r3", name: "Omar Hassan", context: "Sent by you · Study planner", status: "declined", intro: "Love the research angle — would you like help turning interviews into stories?", outgoing: true },
];

const TABS: Tab[] = ["all", "pending", "accepted", "declined", "withdrawn"];

export default function RequestsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<DemoRequest[]>(SEED);
  const [notice, setNotice] = useState<string | null>(null);

  const visible = items.filter((r) => tab === "all" || r.status === tab);

  async function act(id: string, action: "accept" | "decline" | "withdraw") {
    const result = await apiFetch(`/api/requests/${id}`, { method: "POST", body: JSON.stringify({ action }) });
    if ("error" in result) {
      // Demo: apply locally, drafts preserved; API enforced when connected
      setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status: action === "accept" ? "accepted" : action === "decline" ? "declined" : "withdrawn" } : r)));
      setNotice(action === "decline" ? "Declined quietly — the sender sees a kind, generic note. Nothing else is shared." : `Request ${action}ed (simulated). Enforced via API when connected.`);
      return;
    }
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status: action === "accept" ? "accepted" : action === "decline" ? "declined" : "withdrawn" } : r)));
  }

  return (
    <section className="space-y-5" aria-labelledby="requests-heading">
      <div>
        <p className="text-[11px] font-bold tracking-[0.18em] text-[#7541e9] uppercase">Connections with a purpose</p>
        <h1 id="requests-heading" className="mt-1 text-3xl font-extrabold text-[#301544]">A little context goes a long way.</h1>
        <p className="mt-1 text-sm text-[#786989]">One introduction. A clear reason to connect. A conversation when both people agree.</p>
      </div>

      <div className="rounded-xl border border-[#7541e9]/30 bg-[#f2eafe] p-3 text-sm" role="note">
        <strong>One-introduction rule:</strong> you can send one introduction before acceptance. Further messages unlock only after acceptance.
      </div>

      <div role="tablist" aria-label="Filter requests" className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold capitalize ${tab === t ? "bg-[#7541e9] text-white" : "border border-[#e7dcef] bg-white text-[#786989] hover:bg-[#f2eafe]"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {notice ? <p role="status" className="rounded-lg bg-[#dff0e5] p-3 text-sm">{notice}</p> : null}

      {visible.length === 0 ? (
        <EmptyState title="Nothing here yet." message={tab === "pending" ? "No pending introductions. Silent declines stay kind — no reasons are shared." : "No requests in this state."} actionLabel="Meet sample people" actionHref="/people" />
      ) : (
        <div className="grid gap-4">
          {visible.map((r) => (
            <RequestCard key={r.id} name={r.name} context={r.context} status={r.status} intro={r.intro}>
              <div className="flex flex-wrap gap-2">
                {r.status === "pending" && !r.outgoing ? (
                  <>
                    <Button size="sm" className="bg-[#7541e9] text-white" onClick={() => act(r.id, "accept")}>Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => act(r.id, "decline")}>Decline</Button>
                  </>
                ) : null}
                {r.status === "pending" && r.outgoing ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => act(r.id, "accept")}>Simulate acceptance</Button>
                    <Button size="sm" variant="ghost" onClick={() => act(r.id, "withdraw")}>Withdraw</Button>
                  </>
                ) : null}
                {r.status === "accepted" ? (
                  <Link href="/messages" className="inline-flex h-7 items-center rounded-lg bg-[#f2eafe] px-2.5 text-[0.8rem] font-medium text-[#301544]">Open conversation →</Link>
                ) : null}
                {r.status === "declined" && r.outgoing ? (
                  <span className="text-xs text-[#786989]">Still pending on your side — declines are silent and kind.</span>
                ) : null}
              </div>
            </RequestCard>
          ))}
        </div>
      )}
    </section>
  );
}
