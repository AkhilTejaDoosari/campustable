import * as Sentry from "@sentry/nextjs";

export function initSentry(opts: { dsn?: string; environment?: string } = {}): void {
  const dsn = opts.dsn ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: opts.environment ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request?.cookies) delete event.request.cookies;
      if (event.user?.email) delete event.user.email;
      return event;
    },
  });
}

export { Sentry };
