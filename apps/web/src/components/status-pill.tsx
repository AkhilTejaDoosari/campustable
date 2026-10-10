import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";

const TONES: Record<string, string> = {
  Idea: "bg-[#f2eafe] text-[#7541e9] border-[#e7dcef]",
  Recruiting: "bg-[#7541e9] text-white border-[#7541e9]",
  "In progress": "bg-[#dff0e5] text-[#2c6b46] border-[#bfe3cd]",
  Completed: "bg-[#dff0e5] text-[#2c6b46] border-[#bfe3cd]",
  pending: "bg-[#fff4e0] text-[#8a5a00] border-[#f0d9a8]",
  accepted: "bg-[#dff0e5] text-[#2c6b46] border-[#bfe3cd]",
  declined: "bg-[#f6edff] text-[#786989] border-[#e7dcef]",
  withdrawn: "bg-[#f6edff] text-[#786989] border-[#e7dcef]",
  Demo: "bg-[#34204a] text-[#f6edff] border-[#34204a]",
  Simulated: "bg-[#34204a] text-[#f6edff] border-[#34204a]",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", TONES[status] ?? "bg-[#f2eafe] text-[#301544]", className)}
    >
      {status}
    </Badge>
  );
}

export function VerificationLabel({ label, demo }: { label: string; demo: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-[#786989]">
      <span className="rounded-full border border-[#e7dcef] bg-white px-2 py-0.5 font-medium">{label}</span>
      {demo ? <StatusPill status="Demo" /> : null}
    </span>
  );
}
