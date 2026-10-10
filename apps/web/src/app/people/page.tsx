"use client";

import { useMemo, useState } from "react";
import { PersonCard } from "@/components/cards";
import { EmptyState } from "@/components/state-cards";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UniversityCombobox } from "@/components/university-combobox";
import { ALL_SKILLS, DEMO_PEOPLE, UNIVERSITIES } from "@/components/demo-data";

const MY_UNIVERSITY = "Windmere University";

export default function PeoplePage() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [university, setUniversity] = useState("");
  const [skill, setSkill] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEMO_PEOPLE.filter((p) => {
      if (role !== "all" && p.role !== role) return false;
      if (skill !== "all" && !p.skills.includes(skill)) return false;
      if (availableOnly && !p.available) return false;
      if (university) {
        const u = university.trim().toLowerCase();
        const uni = u === "@my-university" ? MY_UNIVERSITY.toLowerCase() : u;
        if (!p.university.toLowerCase().includes(uni)) return false;
      }
      if (q && ![p.name, p.major, p.about, ...p.skills, ...p.wants].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, role, university, skill, availableOnly]);

  function clear() {
    setQuery("");
    setRole("all");
    setUniversity("");
    setSkill("all");
    setAvailableOnly(false);
  }

  return (
    <section className="space-y-5" aria-labelledby="people-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.18em] text-[#7541e9] uppercase">Different skills. Shared possibilities.</p>
          <h1 id="people-heading" className="mt-1 text-3xl font-extrabold tracking-tight text-[#301544]">
            Find a reason to connect.
          </h1>
          <p className="mt-1 text-sm text-[#786989]">Fictional sample profiles. Skills are self-reported.</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-[#e7dcef] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4" role="search" aria-label="Search people">
        <div className="space-y-1.5">
          <Label htmlFor="people-query">Search skills, topics, or people</Label>
          <Input id="people-query" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try design, Python, or research" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-filter">Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v ?? "all")}>
            <SelectTrigger id="role-filter"><SelectValue placeholder="All roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="Student">Student</SelectItem>
              <SelectItem value="Alumni">Alumni</SelectItem>
              <SelectItem value="Faculty">Faculty</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <UniversityCombobox value={university} onChange={setUniversity} options={UNIVERSITIES} myUniversity={MY_UNIVERSITY} />
        <div className="space-y-1.5">
          <Label htmlFor="skill-filter">Skill</Label>
          <Select value={skill} onValueChange={(v) => setSkill(v ?? "all")}>
            <SelectTrigger id="skill-filter"><SelectValue placeholder="All skills" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All skills</SelectItem>
              {ALL_SKILLS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-4">
          <Checkbox id="available" checked={availableOnly} onCheckedChange={(v) => setAvailableOnly(v === true)} />
          <Label htmlFor="available" className="text-sm font-medium">Available now only</Label>
        </div>
      </div>

      <p role="status" aria-live="polite" className="text-sm text-[#786989]">
        {results.length} fictional {results.length === 1 ? "person" : "people"} found
      </p>

      {results.length === 0 ? (
        <EmptyState title="No matches yet." message="Try a broader skill or another university. Filters narrow visible results only." actionLabel="Clear filters" onAction={clear} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((p) => (
            <PersonCard key={p.id} person={p} demo />
          ))}
        </div>
      )}
    </section>
  );
}
