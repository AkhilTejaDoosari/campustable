"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusPill } from "@/components/status-pill";
import { UNIVERSITIES } from "@/components/demo-data";

const UNIVERSITY_FIRST = UNIVERSITIES[0] as string;
import { apiFetch, useDraft } from "@/components/api-client";

type Role = "student" | "alumni" | "faculty";

const ROLE_COPY: Record<Role, { verification: string; hint: string }> = {
  student: { verification: "University email verified", hint: "Mailbox access confirms enrollment. Other details are self-reported." },
  alumni: { verification: "Graduation self-reported", hint: "Graduation details are self-reported until reviewed." },
  faculty: { verification: "Faculty role reviewed", hint: "Faculty posts are member posts, not institutional approval." },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("student");
  const [name, setName] = useDraft("ct-onboarding-name", "");
  const [university, setUniversity] = useState<string>(UNIVERSITIES[0]);
  const [major, setMajor] = useDraft("ct-onboarding-major", "");
  const [about, setAbout] = useDraft("ct-onboarding-about", "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const majorRef = useRef<HTMLInputElement>(null);
  const aboutRef = useRef<HTMLTextAreaElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Display name is required.");
      nameRef.current?.focus();
      return;
    }
    if (!major.trim()) {
      setError("Major or department is required.");
      majorRef.current?.focus();
      return;
    }
    if (!about.trim()) {
      setError("Tell us what brings you here (required).");
      aboutRef.current?.focus();
      return;
    }
    setSaving(true);
    const result = await apiFetch("/api/onboarding", {
      method: "POST",
      body: JSON.stringify({ role, name, university, major, about }),
    });
    setSaving(false);
    if ("error" in result) {
      // Demo mode: proceed with simulated pending-review gate, draft preserved
      router.push("/review");
      return;
    }
    router.push("/people");
  }

  return (
    <section className="mx-auto max-w-2xl space-y-4" aria-labelledby="onboarding-heading">
      <div>
        <p className="text-[11px] font-bold tracking-[0.18em] text-[#7541e9] uppercase">Join the Community</p>
        <h1 id="onboarding-heading" className="mt-1 text-3xl font-extrabold tracking-tight text-[#301544]">
          Tell us who you are
        </h1>
        <p className="mt-1 text-sm text-[#786989]">Role-adaptive setup. Verification honesty is built in — simulated items carry a Demo tag.</p>
      </div>

      <div role="tablist" aria-label="Choose your role" className="grid grid-cols-3 gap-2">
        {(["student", "alumni", "faculty"] as Role[]).map((r) => (
          <button
            key={r}
            role="tab"
            aria-selected={role === r}
            onClick={() => setRole(r)}
            className={`rounded-2xl border p-3 text-left ${role === r ? "border-[#7541e9] bg-[#f2eafe]" : "border-[#e7dcef] bg-white hover:bg-[#fcf9ff]"}`}
          >
            <span className="block text-sm font-bold capitalize text-[#301544]">{r}</span>
            <span className="block text-xs text-[#786989]">
              {r === "student" ? "Find a teammate" : r === "alumni" ? "Mentor students" : "Advise projects"}
            </span>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {role === "student" ? "Student setup" : role === "alumni" ? "Alumni setup" : "Faculty setup"}
            <StatusPill status="Simulated" />
          </CardTitle>
          <CardDescription>{ROLE_COPY[role].hint}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="ob-name">Display name *</Label>
              <Input id="ob-name" ref={nameRef} required value={name} onChange={(e) => setName(e.target.value)} maxLength={70} placeholder="Alex Morgan" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ob-uni">University *</Label>
                <Select value={university} onValueChange={(v) => setUniversity(v ?? UNIVERSITY_FIRST)}>
                  <SelectTrigger id="ob-uni"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIVERSITIES.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ob-major">{role === "faculty" ? "Department *" : "Major *"}</Label>
                <Input id="ob-major" ref={majorRef} required value={major} onChange={(e) => setMajor(e.target.value)} placeholder={role === "faculty" ? "Environmental Engineering" : "Computer Science"} />
              </div>
            </div>
            {role === "student" ? (
              <div className="space-y-1.5">
                <Label htmlFor="ob-email">University email *</Label>
                <Input id="ob-email" type="email" required placeholder="you@university.edu" aria-describedby="ob-email-hint" />
                <p id="ob-email-hint" className="text-xs text-[#786989]">Mailbox access = University email verified. Nothing else is verified by email.</p>
              </div>
            ) : null}
            {role === "alumni" ? (
              <div className="space-y-1.5">
                <Label htmlFor="ob-grad">Graduation year + degree *</Label>
                <Input id="ob-grad" required placeholder="May 2025 · B.S. Business Analytics" />
                <p className="text-xs text-[#786989]">Labeled Graduation self-reported until reviewed.</p>
              </div>
            ) : null}
            {role === "faculty" ? (
              <div className="space-y-1.5">
                <Label htmlFor="ob-title">Title + department *</Label>
                <Input id="ob-title" required placeholder="Assistant Professor · Environmental Engineering" />
                <p className="text-xs text-[#786989]">Labeled Faculty role reviewed after review. Posts are member posts, not institutional approval.</p>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="ob-about">What brings you here? *</Label>
              <Textarea id="ob-about" ref={aboutRef} required value={about} onChange={(e) => setAbout(e.target.value)} maxLength={600} placeholder="A skill, a question, or a project idea…" />
            </div>
            <div className="rounded-xl border border-[#e7dcef] bg-[#fcf9ff] p-3 text-xs text-[#786989]">
              Verification status: <strong className="text-[#301544]">{ROLE_COPY[role].verification}</strong> · Demo
            </div>
            {error ? (
              <p role="alert" className="text-sm font-medium text-[#9e353c]">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full bg-[#7541e9] text-white hover:bg-[#602cce]" disabled={saving}>
              {saving ? "Saving…" : "Continue →"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
