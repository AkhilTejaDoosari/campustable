# Observability
Structured events: project published, request created/accepted, membership created, project started, role closed, auth/verification failure, dependency timeout. IDs and safe metadata only; omit private emails, tokens, message bodies and evidence.
Health endpoint verifies process; readiness checks bounded critical dependency access without exposing credentials.
Track accepted project requests, filled roles and confirmed starts separately. Self-reported outcomes not verified achievements. Operational metrics: request latency/error rate, container restarts, CPU/memory, disk use. Alerts need owners, thresholds, and concrete response runbook before pilot.
