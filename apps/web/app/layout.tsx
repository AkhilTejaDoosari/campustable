import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CampusTable",
  description: "Find willing people for clearly defined work.",
};

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const body = (
    <html lang="en">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  );
  // Fail closed without pretending: auth-dependent subtrees render on demand
  // (force-dynamic) and show a missing-config state when no key is configured,
  // so `next build` and public pages never need real secrets.
  if (!publishableKey) return body;
  return <ClerkProvider publishableKey={publishableKey}>{body}</ClerkProvider>;
}
