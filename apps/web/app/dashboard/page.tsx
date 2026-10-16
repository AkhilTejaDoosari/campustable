import { UserButton } from "@clerk/nextjs";
import { getCurrentUser } from "@campustable/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (user && user.onboardingState !== "complete") redirect("/onboarding");
  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-semibold">Account unavailable</h1>
        <p className="mt-4 text-neutral-600">
          You are signed in, but your CampusTable account could not be loaded. This is usually
          transient.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/dashboard"
            className="rounded-md bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-700"
          >
            Try again
          </Link>
          <Link
            href="/sign-in"
            className="rounded-md border border-neutral-300 px-4 py-2 hover:bg-neutral-50"
          >
            Sign in again
          </Link>
        </div>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <UserButton />
      </div>
      <p className="mt-4 text-neutral-600">
        Signed in as <span className="font-medium">{user.primaryEmail}</span> (role: {user.role}).
      </p>
      <ul className="mt-6 list-disc pl-6 text-sm text-neutral-700">
        <li>Onboarding state: {user.onboardingState}</li>
        <li>
          Next:{" "}
          <a className="underline" href="/verify">
            verify your school email
          </a>
        </li>
      </ul>
    </main>
  );
}
