import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // Scrub PII-ish fields defensively.
      if (event.request?.cookies) delete event.request.cookies;
      return event;
    },
  });
}
