import Link from "next/link";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function EmptyState({
  title,
  message,
  actionLabel,
  actionHref,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <Card className="border-dashed text-center" role="status">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-[#786989]">{message}</p>
        {actionLabel && actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-[#f2eafe] px-2.5 text-sm font-medium text-[#301544]"
          >
            {actionLabel}
          </Link>
        ) : null}
        {actionLabel && onAction && !actionHref ? <Button variant="secondary" onClick={onAction}>{actionLabel}</Button> : null}
      </CardContent>
    </Card>
  );
}

export function ErrorState({
  message,
  onRetry,
  demo = true,
}: {
  message: string;
  onRetry?: () => void;
  demo?: boolean;
}) {
  return (
    <Card className="border-[#f0c9c9] bg-[#fff7f7]" role="alert">
      <CardContent className="space-y-3 pt-4">
        <p className="text-sm font-semibold text-[#9e353c]">Something needs attention</p>
        <p className="text-sm text-[#786989]">{message}</p>
        {demo ? (
          <p className="text-xs text-[#786989]">
            Demo mode: showing fictional sample data. Form drafts are preserved in this browser.
          </p>
        ) : null}
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="grid gap-3" aria-label={label}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl border border-[#e7dcef] bg-[#f2eafe]/60" />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}
