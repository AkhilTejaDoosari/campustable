"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusPill, VerificationLabel } from "@/components/status-pill";
import { apiFetch } from "@/components/api-client";

export default function ProfilePage() {
  const [name, setName] = useState("Alex Morgan");
  const [about, setAbout] = useState("Looking for a design collaborator to build something useful for students.");
  const [talent, setTalent] = useState(false);
  const [resume, setResume] = useState(false);
  const [skills, setSkills] = useState("Python, Project management");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (talent && !resume) {
      setError("A sample resume is required to turn talent visibility on.");
      return;
    }
    const result = await apiFetch("/api/profile", { method: "PUT", body: JSON.stringify({ name, about, talent, skills }) });
    if ("error" in result) {
      setStatus("Saved locally in demo mode (simulated). Draft preserved — connect the API to persist.");
      return;
    }
    setStatus("Profile saved.");
  }

  return (
    <section className="space-y-5" aria-labelledby="profile-heading">
      <div>
        <p className="text-[11px] font-bold tracking-[0.18em] text-[#7541e9] uppercase">Your place at the table</p>
        <h1 id="profile-heading" className="mt-1 text-3xl font-extrabold text-[#301544]">{name}</h1>
        <p className="mt-1 text-sm text-[#786989]">Student · Windmere University</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Edit profile</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pf-name">Display name *</Label>
                <Input id="pf-name" required value={name} onChange={(e) => setName(e.target.value)} maxLength={70} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pf-about">About me *</Label>
                <Textarea id="pf-about" required value={about} onChange={(e) => setAbout(e.target.value)} maxLength={600} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pf-skills">Topics I’m open to discussing</Label>
                <Input id="pf-skills" value={skills} onChange={(e) => setSkills(e.target.value)} />
              </div>
              <div className="space-y-2 rounded-xl border border-[#e7dcef] bg-[#fcf9ff] p-3">
                <div className="flex items-start gap-2">
                  <Checkbox id="pf-resume" checked={resume} onCheckedChange={(v) => setResume(v === true)} />
                  <Label htmlFor="pf-resume" className="text-sm">Attach a sample resume (simulation)</Label>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox id="pf-talent" checked={talent} onCheckedChange={(v) => setTalent(v === true)} />
                  <Label htmlFor="pf-talent" className="text-sm">Share my fictional profile with talent seekers</Label>
                </div>
                <p className="text-xs text-[#786989]">Talent visibility requires a resume. No files are uploaded in demo mode.</p>
              </div>
              {error ? <p role="alert" className="text-sm font-medium text-[#9e353c]">{error}</p> : null}
              {status ? <p role="status" className="text-sm text-green-700">{status}</p> : null}
              <Button type="submit" className="bg-[#7541e9] text-white hover:bg-[#602cce]">Save changes</Button>
            </form>
          </CardContent>
        </Card>
        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-2 pt-4">
              <h2 className="font-bold">Community profile</h2>
              <StatusPill status="Demo" />
              <div className="pt-1"><VerificationLabel label="University email verified" demo /></div>
              <p className="text-sm">Talent visibility: <strong>{talent ? "On" : "Off"}</strong></p>
              <p className="text-xs text-[#786989]">Everything in this profile is fictional. Demo edits are temporary.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
}
