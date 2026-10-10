import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { StatusPill, VerificationLabel } from "./status-pill";
import type { DemoPerson, DemoProject } from "./demo-data";

function initials(name: string): string {
  return name
    .split(" ")
    .filter((w) => w !== "Dr.")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
}

export function PersonCard({ person, demo = true }: { person: DemoPerson; demo?: boolean }) {
  return (
    <Card className="transition-shadow hover:shadow-lg hover:shadow-[#7541e9]/10">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-[#7541e9] font-bold text-white"
          >
            {initials(person.name)}
          </span>
          <div className="min-w-0">
            <CardTitle className="truncate">{person.name}</CardTitle>
            <CardDescription>
              {person.role} · {person.major}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-[#786989]">{person.university}</p>
        <p className="line-clamp-3 text-sm">{person.about}</p>
        <div className="flex flex-wrap gap-1.5" aria-label="Skills">
          {person.skills.slice(0, 3).map((s) => (
            <span key={s} className="rounded-full bg-[#f2eafe] px-2 py-0.5 text-xs font-medium text-[#301544]">
              {s}
            </span>
          ))}
        </div>
        <p className="text-xs text-[#786989]" aria-label="Availability">
          {person.available ? "● " : "○ "}
          {person.availability}
        </p>
        <VerificationLabel label={person.verification} demo={demo} />
        <Link
          href={`/person/${person.id}`}
          className="inline-flex items-center justify-center rounded-lg border border-[#7541e9] px-3 py-1.5 text-sm font-semibold text-[#7541e9] hover:bg-[#f2eafe]"
        >
          View profile ↗
        </Link>
      </CardContent>
    </Card>
  );
}

export function ProjectCard({ project }: { project: DemoProject }) {
  return (
    <Card className="transition-shadow hover:shadow-lg hover:shadow-[#7541e9]/10">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-lg bg-[#ffe2d5] text-lg text-[#301544]">
            ✦
          </span>
          <StatusPill status={project.stage} />
        </div>
        <CardTitle className={cn("text-lg")}>{project.title}</CardTitle>
        <CardDescription>{project.university} · Led by {project.owner}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="line-clamp-3 text-sm">{project.problem}</p>
        <div className="flex flex-wrap gap-1.5" aria-label="Help needed">
          {project.needs.map((n) => (
            <span key={n} className="rounded-full bg-[#f2eafe] px-2 py-0.5 text-xs font-medium text-[#301544]">
              {n}
            </span>
          ))}
        </div>
        <p className="text-xs text-[#786989]">{project.commitment}</p>
        <Link
          href={`/project/${project.id}`}
          className="inline-flex items-center justify-center rounded-lg border border-[#7541e9] px-3 py-1.5 text-sm font-semibold text-[#7541e9] hover:bg-[#f2eafe]"
        >
          View project ↗
        </Link>
      </CardContent>
    </Card>
  );
}

export function RequestCard({
  name,
  context,
  status,
  intro,
  children,
}: {
  name: string;
  context: string;
  status: string;
  intro: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{name}</CardTitle>
            <CardDescription>{context}</CardDescription>
          </div>
          <StatusPill status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <blockquote className="rounded-lg border-l-4 border-[#7541e9] bg-[#fcf9ff] px-3 py-2 text-sm italic">
          {intro}
        </blockquote>
        {children}
      </CardContent>
    </Card>
  );
}
