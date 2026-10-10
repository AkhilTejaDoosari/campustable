import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthCallbackPage() {
  return (
    <section className="mx-auto max-w-md" aria-labelledby="callback-heading" aria-live="polite">
      <Card>
        <CardHeader>
          <CardTitle id="callback-heading">Checking your sign-in link…</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[#786989]">
            If this takes more than a few seconds, your link may have expired. In demo mode no real session is created.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/onboarding" className="rounded-full bg-[#7541e9] px-4 py-2 text-sm font-bold text-white">
              Continue to onboarding
            </Link>
            <Link href="/login" className="rounded-full border border-[#7541e9] px-4 py-2 text-sm font-bold text-[#7541e9]">
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
