"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ProjectCard } from "@/components/cards";
import { EmptyState } from "@/components/state-cards";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UniversityCombobox } from "@/components/university-combobox";
import { DEMO_PROJECTS, UNIVERSITIES } from "@/components/demo-data";

export default function ProjectsPage() {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const [university, setUniversity] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEMO_PROJECTS.filter((p) => {
      if (stage !== "all" && p.stage !== stage) return false;
      if (university && !p.university.toLowerCase().includes(university.trim().toLowerCase().replace("@my-university", "windmere"))) return false;
      if (q && ![p.title, p.problem, p.goal, ...p.needs].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, stage, university]);

  return (
    <section className="space-y-5" aria-labelledby="projects-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.18em] text-[#7541e9] uppercase">Your next chapter</p>
          <h1 id="projects-heading" className="mt-1 text-3xl font-extrabold tracking-tight text-[#301544]">Ideas need people.</h1>
          <p className="mt-1 text-sm text-[#786989]">Find a project where your contribution matters — or share what you want to build.</p>
        </div>
        <Link href="/projects/new" className="inline-flex rounded-full bg-[#7541e9] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#602cce]">
          Start a project ↗
        </Link>
      </div>

      <div className="grid gap-3 rounded-2xl border border-[#e7dcef] bg-white p-4 sm:grid-cols-3" role="search" aria-label="Search projects">
        <div className="space-y-1.5">
          <Label htmlFor="project-query">Search projects or skills</Label>
          <Input id="project-query" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try React or sustainability" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="project-stage">Project stage</Label>
          <Select value={stage} onValueChange={(v) => setStage(v ?? "all")}>
            <SelectTrigger id="project-stage"><SelectValue placeholder="All stages" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              <SelectItem value="Idea">Idea</SelectItem>
              <SelectItem value="Recruiting">Recruiting</SelectItem>
              <SelectItem value="In progress">In progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <UniversityCombobox value={university} onChange={setUniversity} options={UNIVERSITIES} myUniversity="Windmere University" />
      </div>

      <p role="status" aria-live="polite" className="text-sm text-[#786989]">{results.length} fictional projects</p>

      {results.length === 0 ? (
        <EmptyState title="No projects match." message="Try another skill or stage." actionLabel="Clear filters" onAction={() => { setQuery(""); setStage("all"); setUniversity(""); }} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </section>
  );
}
