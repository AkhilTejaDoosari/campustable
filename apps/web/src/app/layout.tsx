import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "CampusTable",
  description: "Find people to learn with and build together — university project collaboration for students, alumni, and faculty.",
};

function isDemo(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const demo = isDemo();
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold"
        >
          Skip to content
        </a>
        <Suspense fallback={<div className="min-h-[68px] border-b border-[#e7dcef]/60" aria-hidden="true" />}>
          <SiteHeader demo={demo} />
        </Suspense>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-4 sm:px-8">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
