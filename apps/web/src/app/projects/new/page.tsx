"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, useDraft, clearDraft } from "@/components/api-client";

const DRAFT_KEY = "ct-project-draft";

export default function NewProjectPage() {
  const router = useRouter();
  const [draft, setDraft] = useDraft(DRAFT_KEY, "");
  const parsed: Record<string, string> = (() => {
    try {
      return draft ? (JSON.parse(draft) as Record<string, string>) : {};
    } catch {
      return {};
    }
  })();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const needsRef = useRef<HTMLInputElement>(null);
  const contributionRef = useRef<HTMLTextAreaElement>(null);
  const commitmentRef = useRef<HTMLInputElement>(null);

  function set(field: string, value: string) {
    setDraft(JSON.stringify({ ...parsed, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const required: Array<[string, string, React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>]> = [
      ["title", "Project title", titleRef],
      ["description", "Project description", descriptionRef],
      ["needs", "Help / skills needed", needsRef],
      ["contribution", "What you can contribute", contributionRef],
      ["commitment", "Weekly commitment", commitmentRef],
    ];
    for (const [field, label, ref] of required) {
      if (!((parsed[field] ?? "").trim())) {
        setError(`${label} is required.`);
        (ref.current as HTMLElement | null)?.focus();
        return;
      }
    }
    setSaving(true);
    const result = await apiFetch("/api/projects", { method: "POST", body: JSON.stringify(parsed) });
    setSaving(false);
    if ("error" in result) {
      setError("Service unavailable in demo mode — your draft is preserved in this browser. Connect the API to publish.");
      return;
    }
    clearDraft(DRAFT_KEY);
    router.push("/projects");
  }

  return (
    <section className="mx-auto max-w-2xl space-y-4" aria-labelledby="new-project-heading">
      <div>
        <p className="text-[11px] font-bold tracking-[0.18em] text-[#7541e9] uppercase">Start your next chapter</p>
        <h1 id="new-project-heading" className="mt-1 text-3xl font-extrabold text-[#301544]">Share a project brief</h1>
        <p className="mt-1 text-sm text-[#786989]">Clear briefs attract the right people. Drafts auto-save in this browser.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Project brief</CardTitle>
          <CardDescription>Required: title, description, needs, contribution, commitment. First missing field receives focus.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="np-title">Project title *</Label>
              <Input id="np-title" ref={titleRef} required value={parsed.title ?? ""} onChange={(e) => set("title", e.target.value)} maxLength={80} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="np-desc">What do you want to build? *</Label>
              <Textarea id="np-desc" ref={descriptionRef} required value={parsed.description ?? ""} onChange={(e) => set("description", e.target.value)} maxLength={1000} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="np-needs">Help / skills needed *</Label>
              <Input id="np-needs" ref={needsRef} required value={parsed.needs ?? ""} onChange={(e) => set("needs", e.target.value)} placeholder="UI design, Python, research" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="np-contrib">What you can contribute *</Label>
              <Textarea id="np-contrib" ref={contributionRef} required value={parsed.contribution ?? ""} onChange={(e) => set("contribution", e.target.value)} maxLength={600} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="np-commit">Weekly commitment *</Label>
              <Input id="np-commit" ref={commitmentRef} required value={parsed.commitment ?? ""} onChange={(e) => set("commitment", e.target.value)} placeholder="2–4 hours / week for 6 weeks" />
            </div>
            {error ? <p role="alert" className="text-sm font-medium text-[#9e353c]">{error}</p> : null}
            <Button type="submit" className="w-full bg-[#7541e9] text-white hover:bg-[#602cce]" disabled={saving}>
              {saving ? "Saving…" : "Create project ↗"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
