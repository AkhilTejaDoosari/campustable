import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/status-pill";

export default function ReviewPage() {
  return (
    <section className="mx-auto max-w-xl" aria-labelledby="review-heading">
      <Card>
        <CardContent className="space-y-4 pt-6 text-center">
          <StatusPill status="pending" />
          <h1 id="review-heading" className="text-2xl font-extrabold text-[#301544]">Your details are ready for review.</h1>
          <p className="text-sm text-[#786989]">
            This profile would stay inactive until the required affiliation review is complete.
          </p>
          <div className="rounded-xl bg-[#fff4e0] p-3 text-sm" role="note">
            This is a scripted demo. No review was submitted, and no real identity has been verified.
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/people" className="rounded-full bg-[#7541e9] px-5 py-2.5 text-sm font-bold text-white">
              Simulate reviewer approval →
            </Link>
            <Link href="/" className="rounded-full border border-[#7541e9] px-5 py-2.5 text-sm font-bold text-[#7541e9]">
              Explore another role
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
