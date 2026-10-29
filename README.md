# ticketing-v3
Ticketing Service V3

Buyer/seller/admin functional MVP implemented and validated locally against real MySQL and Chromium after environment recovery. No real payment; main remains unchanged.

- Signup/login/logout with session+CSRF, approved catalog/search/detail, sessions/seats,5-minute max4seat holds, expiry/release, mock payment and reservation history.
- Seller venue/seats/performance/session/shared-sale creation; admin review with ownership/self-review protections. Trusted local CLI creates seller/admin; public signup is buyer-only.
- Initial integration checks (historical): backend9tests including100actual authenticated competitors→1winner/99conflicts; frontend25tests/build/typecheck; full real browser E2E with70OpenAPI-validated responses.
- [Integration evidence](docs/reports/2026-10-29-integration.md), [runbook](docs/development-runbook.md), [architecture/decisions](docs/architecture/tech-decisions.md), [OpenAPI](docs/api/openapi.yaml), [pending policies](docs/requirements/open-decisions.md).

Ports: frontend13000, backend18080, isolated MySQL13306. Runtime processes must restart after environment recovery. Backend requires Java21JDK to build; frontend Node24. Use immutable built jar for running/provisioning while other builds run. No credentials committed.

Cancellation/refund/resale/payment retry, public role transitions, production deployment and load guarantees remain outside validated scope. V1/V2 untouched; no main push/merge without explicit approval. Existing isolated checkout is sufficient; worktrees were explicitly requested for this parallel workflow.

## Issue #1 QA (2026-10-29)
See [QA report](docs/reports/2026-10-29-v3-qa.md) for baseline13f40e6 verification, fractional input rejection, server-authoritative active hold restoration, real300second expiry/network regressions and bounded lock-gate measurements. OpenAPI0.3 adds owner-only active hold listing and optional persisted payment status; no cancellation/refund/retry/re-review policy is introduced. Existing release report above remains historical evidence.

## UI redesign (2026-10-29)
Buyer discovery/detail/booking and seller/admin operations now follow the actual MOMENT design in `ticketing-service/dev`, with shared tokens, responsive seat selection and accessible authentication/confirmation dialogs. Issue #1 API/state safeguards are preserved. V2 source access was denied (403); no V2 design claims are made.

- [Redesign evidence and Before/After](docs/reports/2026-10-29-v3-ui-redesign.md), [reference source analysis](docs/design/reference-analysis.md), [design system](docs/design/design-system.md).
- Final frontend:40tests/typecheck/production build PASS; actual Chromium screen checks at390/768/1440 and real API fault regression PASS. Backend unchanged,15current MySQL tests PASS including100authenticated contenders→1winner/99conflicts. Detailed full-flow/expiry results and limitations are recorded in the report.
- Local start/reproduction instructions and separate `ticketing_v3_ui_app`/`ticketing_v3_ui_test` schema details are in that report. No environment publication or production deployment.
