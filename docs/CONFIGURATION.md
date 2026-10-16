# Configuration and dependency inventory — Phase 0C finalized (locked 2026-10-16)

Supersedes the provisional template. The single env contract is `apps/web/.env.example`.

| Item                                                     | Owner/use                                                                   | Collect when                                         | Stored where                                             |
| -------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------- |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY     | Clerk identity (login, session)                                             | Slice 1 setup (dedicated dev instance)               | apps/web/.env.local (Mac, 600); Vercel runtime env later |
| CLERK_WEBHOOK_SECRET                                     | Svix verification for /api/webhooks/clerk → users sync                      | Slice 1 setup                                        | Server-only runtime secret                               |
| NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase Postgres + Storage (RLS deny-by-default; anon key browser-visible) | Slice 1 setup (dedicated dev project)                | Same as above                                            |
| SUPABASE_SERVICE_ROLE_KEY                                | Webhook sync, verification RPC, signed uploads only                         | After architecture justification (done: ADR-003/004) | Server-only; never NEXT_PUBLIC                           |
| RESEND_API_KEY / EMAIL_FROM                              | University verification OTP + invitations + notifications                   | Before any real mailbox send (Slice 1/2)             | Server-only runtime secret                               |
| NEXT_PUBLIC_SENTRY_DSN                                   | Error/trace reporting (scrubbed)                                            | Slice 1                                              | Runtime config; empty disables                           |
| NEXT_PUBLIC_POSTHOG_KEY / HOST                           | Funnel events via helper only                                               | Slice 1                                              | Runtime config; empty disables                           |
| NEXT_PUBLIC_APP_URL                                      | Canonical origin; Clerk allowlist + links                                   | Slice 1                                              | Runtime config, not a secret                             |
| OTP_PEPPER                                               | OTP hash pepper                                                             | Slice 1                                              | Server-only random per environment                       |
| No AI keys                                               | AI is abstraction-only, not V1                                              | Only if OpenRouter added later (ADR-010)             | Not in V1 env contract                                   |
| No Cloudflare config                                     | Deferred (ADR-011)                                                          | Only on concrete need                                | None                                                     |

Rules: commit .env.example with blank values only; ignore .env\*; Mac config in apps/web/.env.local (600); validate at startup and fail closed (no demo fallback); CI uses isolated resources, never prod keys; no fixed OTP or simulated verification in the real app. Presence checks only — never paste values into docs/prompts.
