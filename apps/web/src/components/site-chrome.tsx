"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/people", label: "People" },
  { href: "/projects", label: "Projects" },
  { href: "/requests", label: "Requests" },
  { href: "/messages", label: "Messages" },
  { href: "/profile", label: "Profile" },
];

export function SiteHeader({ demo }: { demo: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      {demo ? (
        <div className="bg-[#34204a] px-4 py-2 text-center text-[11px] text-[#f6edff]" role="status">
          Demo mode — fictional sample data. Simulated verification labels carry a Demo tag.
          <Link href="/onboarding" className="ml-3 underline decoration-[#e0c5ff] underline-offset-2">
            Explore setup
          </Link>
        </div>
      ) : null}
      <header className="sticky top-0 z-50 border-b border-[#e7dcef]/60 bg-[#fcf9ff]/95 backdrop-blur">
        <div className="mx-auto flex min-h-[68px] w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-[#301544]" aria-label="CampusTable home">
            <span aria-hidden="true" className="grid size-8 place-items-center rounded-lg bg-[#7541e9] text-white">
              <svg viewBox="0 0 32 32" className="size-5" fill="none" stroke="currentColor" strokeWidth="3">
                <circle cx="16" cy="16" r="8" />
                <circle cx="25" cy="9" r="4" fill="#ffad8c" stroke="none" />
              </svg>
            </span>
            CampusTable
          </Link>
          <button
            type="button"
            className="rounded-lg border border-[#e7dcef] px-3 py-2 text-sm font-semibold text-[#786989] md:hidden"
            aria-expanded={open}
            aria-controls="site-nav"
            onClick={() => setOpen((o) => !o)}
          >
            Menu
          </button>
          <nav id="site-nav" aria-label="Primary" className={cn("w-full flex-col gap-1 md:flex md:w-auto md:flex-row md:items-center", open ? "flex" : "hidden")}>
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={pathname?.startsWith(n.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-xl px-3 py-2 text-[13px] font-semibold",
                  pathname?.startsWith(n.href) ? "bg-[#eee4fd] text-[#7541e9]" : "text-[#786989] hover:bg-[#f2eafa]"
                )}
              >
                {n.label}
              </Link>
            ))}
            <Link
              href="/onboarding"
              onClick={() => setOpen(false)}
              className="inline-flex h-7 items-center justify-center rounded-lg bg-[#7541e9] px-2.5 text-[0.8rem] font-medium text-white hover:bg-[#602cce] md:ml-2"
            >
              Join
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[#e7dcef]/60">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-[#786989] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>© 2026 CampusTable · For learning and collaboration only.</p>
        <p>Student collaboration space — not for employment, hiring, or paid work.</p>
      </div>
    </footer>
  );
}
