import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/status-pill";
import { DEMO_PROJECTS } from "@/components/demo-data";

const BRIEF_FIELDS = [
  ["problem", "Problem"],
  ["audience", "Audience"],
  ["goal", "Goal"],
  ["deliverable", "Deliverable"],
  ["successCriteria", "Success criteria"],
  ["exclusions", "Exclusions"],
] as const;

export function generateStaticParams(): Array<{ id: string }> {
  return DEMO_PROJECTS.map((p) => ({ id: p.id }));
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = DEMO_PROJECTS.find((p) => p.id === id);
  if (!project) notFound();

  return (
    <section className="space-y-5" aria-labelledby="project-heading">
      <Link href="/projects" className="text-sm font-semibold text-[#7541e9] hover:underline">← Back to projects</Link>
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#e7dcef] bg-white p-6">
            <StatusPill status={project.stage} />
            <h1 id="project-heading" className="mt-2 text-3xl font-extrabold text-[#301544]">{project.title}</h1>
            <p className="mt-1 text-sm text-[#786989]">{project.university} · Led by {project.owner}</p>
          </div>
          <Card>
            <CardContent className="space-y-4 pt-4">
              {BRIEF_FIELDS.map(([key, label]) => (
                <div key={key}>
                  <h2 className="text-sm font-bold text-[#301544]">{label}</h2>
                  <p className="mt-0.5 text-sm text-[#3d2a55]">{project[key]}</p>
                </div>
              ))}
              <div>
                <h2 className="text-sm font-bold">Help needed</h2>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {project.needs.map((n) => (
                    <span key={n} className="rounded-full bg-[#f2eafe] px-2 py-0.5 text-xs font-medium">{n}</span>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-sm font-bold">What the team brings</h2>
                <p className="mt-0.5 text-sm">{project.contribution}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-3 pt-4">
              <h2 className="font-bold">Build with this team</h2>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between gap-2"><dt className="text-[#786989]">Meeting</dt><dd className="font-medium">{project.meeting}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-[#786989]">Commitment</dt><dd className="font-medium">{project.commitment}</dd></div>
              </dl>
              <div className="rounded-xl bg-[#fcf9ff] p-3 text-xs text-[#786989]">
                Eligibility: open to students, alumni, and faculty. Commitment check — can you give {project.commitment.split(" for")[0]}? Only commit if yes.
              </div>
              <Link href={`/person/maya`} className="inline-flex w-full items-center justify-center rounded-full bg-[#7541e9] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#602cce]">
                Meet the team lead ↗
              </Link>
              <p className="text-xs text-[#786989]">Faculty posts are member posts, not institutional approval. No employment or payment language.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
}
