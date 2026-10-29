# Autonomous MVP execution
User changed operating instructions on2026-10-29 KST: entire working buyer/seller/admin MVP is the target, not a sequence of approval-gated slices. Orchestrator owns prioritization and review; Backend and Frontend continue on separate branch/worktrees. No main changes. No infrastructure expansion.

## Required completion evidence
- Signup/login/logout with server session, CSRF, server-side authorization and role isolation.
- Seller owned venue+physical seats, performance+session+shared sale; admin review and self-review prevention.
- Public approved catalog/search/detail/session aggregates; logged-in seat layout.
- Holds5minutes/max4seats, expiry/release, atomic multi-seat behavior and compare-owner reclamation.
- Mock SUCCESS/FAILURE, unique confirmed reservation and own history; persistent idempotency.
-100different authenticated HTTP users racing one session seat: exactly1success, DB exactly1active ownership. Same physical seat across sessions independent.
- Real browser seller→admin→buyer flow backed by MySQL; frontend mocks alone insufficient.
- Versioned migrations preserve existing data; reproducible commands/reports saved.

No cancellation/refund/resale/payment retry functionality. Public seller onboarding and role transitions remain pending; trusted local development provisioning enables approved seller/admin scenarios without public privilege escalation. No unapproved active-hold quota or grading policy. These optional decisions must not stall purchase flow.
