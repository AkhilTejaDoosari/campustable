import Link from "next/link";

const STEPS = [
  { n: "01", title: "Share your goal", text: "A skill, a question, or a project idea." },
  { n: "02", title: "Find your people", text: "Explore interests and availability." },
  { n: "03", title: "Build together", text: "Send an introduction. Start together." },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="grid items-center gap-8 rounded-3xl border border-[#e7dcef] bg-white/70 p-6 sm:p-10 lg:grid-cols-2" aria-labelledby="hero-heading">
        <div className="space-y-5">
          <p className="text-[11px] font-bold tracking-[0.18em] text-[#7541e9] uppercase">Your people. Your possibilities.</p>
          <h1 id="hero-heading" className="text-4xl leading-[1.05] font-extrabold tracking-tight text-[#301544] sm:text-6xl">
            Find people to
            <br />
            learn with and
            <br />
            <span className="campus-hero-gradient bg-clip-text text-transparent">build together.</span>
          </h1>
          <p className="max-w-md text-[15px] text-[#786989]">
            Connect with students, alumni, and faculty to learn a skill, solve a problem, or build a project.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center rounded-full bg-[#7541e9] px-5 py-3 text-sm font-bold text-white hover:bg-[#602cce]"
            >
              Join the Community ↗
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center justify-center rounded-full border border-[#7541e9] bg-white px-5 py-3 text-sm font-bold text-[#7541e9] hover:bg-[#f2eafe]"
            >
              Explore demo
            </Link>
          </div>
          <p className="text-xs text-[#786989]">For university and college communities. Fictional sample data in demo mode.</p>
        </div>
        <div className="campus-coral-wash rounded-3xl border border-[#e7dcef] p-6" aria-hidden="true">
          <div className="grid gap-3">
            <div className="rounded-2xl bg-[#7541e9] p-5 text-white">
              <p className="text-xs font-bold tracking-widest uppercase opacity-80">This week at the table</p>
              <p className="mt-1 text-xl font-bold">3 fictional projects need help</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-2xl font-extrabold text-[#7541e9]">4</p>
                <p className="text-xs text-[#786989]">sample people to meet</p>
              </div>
              <div className="rounded-2xl bg-[#301544] p-4 text-white">
                <p className="text-2xl font-extrabold">1:1</p>
                <p className="text-xs opacity-80">introductions with context</p>
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-[#7541e9]/40 bg-white/70 p-4 text-sm text-[#301544]">
              “Bring a goal, not just a hello.” — the CampusTable way
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-3xl bg-white p-6 sm:grid-cols-3" aria-label="How it works">
        {STEPS.map((s) => (
          <div key={s.n} className="rounded-2xl border border-[#e7dcef] bg-[#fcf9ff] p-5">
            <p className="text-xs font-bold text-[#7541e9]">
              {s.n} · {s.title}
            </p>
            <p className="mt-1 text-sm text-[#786989]">{s.text}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-[#e7dcef] bg-[#f2eafe] p-6 sm:p-8" aria-labelledby="cta-heading">
        <h2 id="cta-heading" className="text-2xl font-bold text-[#301544]">Take a seat at CampusTable.</h2>
        <p className="mt-1 text-sm text-[#786989]">Choose a role, verify your university tie, and send your first introduction.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/onboarding" className="inline-flex rounded-full bg-[#7541e9] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#602cce]">
            Start onboarding
          </Link>
          <Link href="/people" className="inline-flex rounded-full border border-[#7541e9] bg-white px-5 py-2.5 text-sm font-bold text-[#7541e9] hover:bg-white/70">
            Meet sample people
          </Link>
        </div>
      </section>
    </div>
  );
}
