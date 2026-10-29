# Ticketing V3 MVP recovery integration — 2026-10-29 KST

## Result and provenance
Recovered original checkouts/worktrees and ALL local source commits; no restart from scratch. Backendc200e45 persisted during outage; frontend and uncommitted harness also survived. All refs verified in recovery Git bundle outside checkout. Original Docker container and anonymous MySQL data volume were retained and restarted; original application/test schemas and catalog fixtures survived. /tmp credentials/processes were lost and recreated privately. No reset/clean/force push, no V1/V2 modification and no main update.

## Implemented functional MVP
Buyer signup/login/logout/session/CSRF, approved public search/detail/sessions, authenticated seat layout,5-minute max4seat hold, expiry/release, atomic mock success→reservation/history and mock failure without reservation. Seller owned venues/physical seats, performances/session inventory/shared sale policy; administrator approval/rejection with self-approval and ownership checks. No public role escalation; trusted local CLI provisions new seller/admin. Cancellation/refund/resale/payment retry and role-transition policies remain deferred. All production UI requests use actual API; no mock fallback.

## Reviewed branches and exact source
Backend feat/backend-v3 tip5750be1 integrated viabe227b1 and1c607e0; Frontend feat/frontend-v3 tip90711a7 integrated with60b7325,abddfdc,3f32842,4620c7e,1bae47f. `git diff dev feat/backend-v3 -- backend` and corresponding frontend diff are empty: reviewed runtime/test sources match integrated dev. Orchestrator reviewed contracts, security, transactional writes, migration compatibility and runtime lifecycle; no main-target PR.

## CURRENT recovered-environment evidence (not inherited results)
- Backend JUnit XML timestamps2026-10-29T06:22:54..06:23:19UTC: ModuleBoundary1, BookingMvpIntegration6, CatalogHTTP1, CatalogService1 =9tests,0failures/errors/skipped; bootJar success. Full run36s.
- Exact100distinct buyers register+login through actual HTTP and race one session seat:1winner,99conflicts; DB one ACTIVE hold and one owned inventory row verified. Measured race296ms is a correctness observation, NOT a throughput/TPS/p95 guarantee.
-10concurrent identical hold keys and10identical payment keys each replay one persisted hold/payment/reservation. Also ownership/CSRF, sale validation, expiry/new-owner protection, cross-session independence, partial multiseat rollback, failure/no-retry/history and legacy compatibility tested.
- Legacy ownerless rows remain readable with normalized description, excluded from admin management; direct admin review returns404 without modifying row. Swagger UI HTML and packaged authoritative OpenAPI JSON equality verified by backend suite.
- Final integrated frontend: production webpack build PASS (compile1308ms/TS1501ms); npm test PASS25tests/3files (1.93s); npm run typecheck PASS. Strict application types checked; vendor skipLibCheck limitation remains documented.
- Actual Chromium full E2E from integrated frontend13000 → immutable backend18080 → recovered MySQL13306: PASS seller venue/performance/2sessions/sale → admin approval → buyer UI signup/logout/login/search/detail/session/hold/SUCCESS/history → same physical seat in second session/FAILURE/release.70actual API responses match OpenAPI; HttpOnly/SameSite=Lax session cookies checked; mobile390px no horizontal overflow. No network mock interception.
- Separate public catalog browser smoke PASS:4items, mobile390px, schema valid. Static root architecture gate36Java files PASS no foreign-feature repository imports/no feature cycles (global infrastructure excluded). OpenAPI0.2validated; git diff --check PASS.

## Failures diagnosed and corrected
1. Frontend old-terminal-hold request could regenerate pending idempotency key on ambiguous retry: fixed with completed-vs-pending tracking and regression.
2. Successful login/logout followed by failed CSRF refresh could leave stale identity UI: server result now preserved; token cache cleared/reacquired before mutation, with regressions.
3. Real E2E found select label included option text: explicit separate labels/ids plus exact accessible-name regression fixed it.
4. Running mutable bootJar was overwritten by concurrent rebuild, causing missing lazy-loaded classes during provisioning. Final jar frozen by SHA256; CLI copies artifact privately before execution. No integrity/TLS bypass.
5. Harness relative API request lacked baseURL and assumed A1 instead of server A-1: corrected context and derives label from actual inventory while asserting same physical seat IDs across sessions.
6. Harness attempted reading204response bodies, causing Chromium protocol errors after functional assertions.204now validated as bodyless; full fresh-account run exits0.
7. Older catalog harness waited for URL ending without query string; new client uses?q=. Changed matcher to exact URL pathname, smoke exits0.
8. First root npm verification was invoked from repository root without package.json; reran in tests/integration. Architecture harness initially treated global SQL utility as foreign-feature repository; corrected documented infrastructure exemption, without weakening feature checks.

## Runtime and reproducibility
See docs/development-runbook.md, backend/README.md and role reports. Backend artifact SHA256460ece8767c5449c8d9d49a85f23d6270d6e9136ae0503d24645cff2b511253e at /workspace/shared/runtime-builds/<sha>.jar; started from immutable copy. Frontend running from final integrated build. Fixture credentials are private /tmp files, never Git/logged. Generate fresh accounts for full E2E rerun; test fixture rows retained, never wipe DB. Processes must restart after recovery; no publication/deployment claim.

## Limits / NOT RUN
Production HTTPS/deployment, external payment, refund/cancellation/resale/retry/role transitions, load/TPS/p95 measurements and paid infrastructure are not implemented/validated. Row gate serializes sale/hold operations per performance; profile before scaling. Expiry enforced on access/reclaim without background sweep. Future approval requests must not interrupt independent MVP work. No quantitative parallel speedup claim (no serial baseline measured).
