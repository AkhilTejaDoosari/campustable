import { SignIn } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-2xl font-semibold">Sign in unavailable</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Authentication is not configured. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and
          CLERK_SECRET_KEY.
        </p>
      </main>
    );
  }
  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-6 py-16">
      <h1 className="mb-6 text-2xl font-semibold">Sign in to CampusTable</h1>
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" afterSignInUrl="/dashboard" />
    </main>
  );
}
