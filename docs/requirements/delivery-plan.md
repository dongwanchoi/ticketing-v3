# V3 delivery plan / approval gates
## Slice 1 (in progress)
Approved public performance catalog from isolated MySQL via Spring API and Next UI. OpenAPI v0.1.0 is limited to this slice. Fixtures are for tests only; do not represent bookable production inventory.
## Slice 2 (planned, no completion claim)
Public session listing and aggregated remaining counts; server sessions + CSRF authentication; protected seat detail. Define DTOs/errors and security contract before assignment. Confirm roles and grants before authorization-policy changes.
## Slice 3 (planned; TTL 5 minutes / 4 seats approved)
SessionSeat/hold migrations, atomic conditional updates, hold release/expiry and ownership. Concurrency tests with DB final-state checks and cross-session independence. TTL and per-hold limit approved; remaining lifecycle/integrity decisions require review before finalization.
## Slice 4 (planned)
Mock payment, transactionally confirmed reservations and idempotency, reservation history. Payment retry/cancellation policy requires approval before implementation.
## Slice 5 (planned)
Seller registration and administrator review with self-approval denial; browser role/E2E validation and mobile checks. Load/p95 is measured separately from correctness. No infrastructure purchase is authorized.
## Verification vocabulary
PASS: actually executed and asserted behavior. FAIL: executed with unexpected result. BLOCKED: known environment prerequisite. NOT RUN: not executed. Mock-only frontend tests never count as actual DB/API integration or browser E2E.
