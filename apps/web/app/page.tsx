import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">CampusTable</h1>
      <p className="mt-4 text-lg text-neutral-600">
        Find willing people for clearly defined work. Real accounts, real projects, real
        verification — no demo personas.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/sign-up"
          className="rounded-md bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-700"
        >
          Join the Community
        </Link>
        <Link
          href="/sign-in"
          className="rounded-md border border-neutral-300 px-4 py-2 hover:bg-neutral-50"
        >
          Sign in
        </Link>
      </div>
      <p className="mt-8 text-sm text-neutral-500">
        How it works: create a clear project brief → discover willing members → apply and accept
        within capacity → exchange permitted messages.
      </p>
    </main>
  );
}
