# Approved demo → real application contract

Source: user attachment campustable-demo-fixed(1).html, supplied 2026-10-10.
SHA256: 8db378c5373700f93ad391f8296369dc8ef06d26aad280a3416d9c6c2943000d
Reference: design/approved-demo-reference.html. This file is unchanged; it is an existing design reference, not a newly built demo.

## Preservation rule

Preserve the artwork, brand treatment, colors, typography, layout, ordinary product wording, form order, controls and navigation for approved journeys. No unsolicited redesign or substitution with generic dashboard components.
Extract embedded images to named static assets without redrawing or changing image bytes. Record each asset's source/hash. Port interface components into the actual Next.js app while preserving rendered appearance; do not ship the iframe/srcdoc prototype as the application.
Use side-by-side reference screenshots at matching desktop/mobile viewport sizes. Verify text, assets, layout and interactions, then keyboard/accessibility/error states. Visual checks do not replace permission tests.

## Runtime changes required

Fictional people, university seeds, resumes and outcomes are not real members. Production starts with real records or honest empty states.
Replace persona switching and fake account state with actual authentication/session/profile flows.
Replace preview OTP 123456 and simulated review with real delivery, expiry, attempt limits, replay prevention and authorized review.
Replace in-memory projects/requests/messages with persistent records, database constraints, object permissions and atomic capacity acceptance.
Replace sample resume action with genuine upload and owner-controlled access when that feature is in scope.
Remove demo reset, sample replies, simulated incoming requests and fake collaborator acceptance from production controls. Test fixtures remain isolated.
Replace misleading copy such as Create demo project, Acceptance simulated and No real account was created with factual runtime wording. Preserve ordinary brand copy. New loading, missing-config, delivery-failure and permission-error messages must be accurate.
No fake fallbacks when required external services are missing. Backend secrets must never appear in browser source.

## Inventory and decision points

| Reference area                                                   | Treatment                                                                                                                                                                        |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero and embedded art                                            | Preserve art/layout; remove recruiter-specific hero copy and CTA                                                                                                                 |
| Community role-adaptive onboarding                               | Preserve visuals and order; bind to real fields and explicit verification states                                                                                                 |
| University/skills search controls                                | Preserve appearance and interaction; use persisted directory/topics                                                                                                              |
| People and profile views                                         | Preserve approved display; enforce field-level visibility and actual records                                                                                                     |
| Project listing/detail/create                                    | Preserve approved visuals; expanded complete-brief requirements from latest decisions must be mapped into this journey before code                                               |
| Requests and messages                                            | Preserve journey; enforce silent decline, one introduction per pair and contact authorization                                                                                    |
| Talent opt-in, recruiter onboarding, talent discovery, shortlist | DEFERRED from live V1. Preserve only in the archived reference; no recruiter routes, talent opt-in, shortlist or recruiter APIs.                                                 |
| Demo-only notices, sample-persona controls, pretend verification | Remove/replace as runtime conversion, not visual redesign                                                                                                                        |
| Skills I Can Help With / Skills I Want to Learn wording          | Reference uses old wording; latest product discussion proposed discussion/willingness language. Default preserve supplied copy; document any proposed change before implementing |
| Alumni proof/review and profile project auto-creation            | Reconcile reference with current honest affiliation and complete-project rules during Phase 0B                                                                                   |

## Next chunk: 0B

Create a screen/state/field inventory from this exact file, USER_FLOWS, DOMAIN, initial DATA_MODEL and ACCEPTANCE.
Map each visible control to a real operation, owning record, permission check, success/failure state and acceptance test. Mark missing backend-dependent states. List deviations explicitly; no silent scope changes.
Recruiter scope is resolved: deferred. USER_FLOWS, UI_BACKEND_MAP, DOMAIN, DATA_MODEL and ACCEPTANCE now map the community/project journeys; review them before Phase 0C.
No app code or framework installation during this planning chunk.
