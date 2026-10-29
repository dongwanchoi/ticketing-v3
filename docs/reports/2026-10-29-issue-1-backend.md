# Issue1 Backend QA — baseline dev@13f40e6

## Work scope and safety
Role Backend; worktree /workspace/ticketing-v3-qa-backend branch qa/issue-1-backend. Original pre-publication worktrees left unchanged. QA branch starts exact13f40e6; approved common contract-only commits from coordinator synchronized before packaging. Own backend/** and this report. No V1/V2/main/publish/Issue-comment writes; no DB reset or row deletion outside existing narrowly scoped test fixture cleanup.

Managed Docker inspection found old exited ticketing-v3-catalog-mysql + MySQL8.4.7 image + original anonymous volume69a80d887f6c2cb07aa3a1400df7069e290f426932b92ef58876c90b85e90243. Restarted SAME container; created only new ticketing_v3_issue1_test and ticketing_v3_issue1_app. Original ticketing_v3 and ticketing_v3_mvp_test preserved. First mysql readiness request occurred before startup finished (socket111), later mysqladmin ping succeeded before schema preparation. Runtime binding loopback13306. Existing local fixture root/explicit-empty password is not production configuration.

## Confirmed defects and corrections
Two new actual HTTP/MySQL tests initially FAILED (expected400, received201): seatIds:[id+0.75] silently selected the truncated physical seat; priceKrw:25000.75 silently created a session priced25000. These violate existing integer seat/KRW contract and user intent. Set supported Jackson accept-float-as-int=false so integer fields reject floating-point JSON tokens at HTTP boundary, before writes. Covers fractional seat IDs, KRW and venue row counts. Alternative per-field deserializers require duplicate rules and risk inconsistent endpoints; global JSON integer parsing has no business-policy/lifecycle change, cost is stricter acceptance of noncanonical numeric tokens. No assertions disabled.

Prior partial rollback test collided on the first sorted seat, so it never proved rollback after a successful first update. Added real free-lower-ID→occupied-higher-ID attempt:409; first row remains AVAILABLE/hold_idNULL, only preexisting hold remains, and failed request's idempotency row rolled back. Positive4seat request totals60000 and succeeds. This strengthens evidence rather than claiming a newly fixed transaction bug.

## Approved restoration read contract
Coordinator approved OpenAPI0.3 additive GET /api/holds {items:Hold[]} for current authenticated user's ACTIVE + expires_at>servernow holds orderedid, no inferred active-hold quota. Repository IDs + transactionally consistent owned projections return no foreign holds or expired/released/confirmed holds. Nullable paymentStatus from mock_payment read-only join is persisted state, not a retry policy; FAILED remains in active list until existing TTL/release rules and lets UI suppress unsupported retry. No cross-feature imports/writes or dependency cycles introduced. Tests cover guest401, owner isolation and every excluded state, persistedFAILED on get/list. Domain record addition and expiration response preserve payment state.

## Current actual validation
Baseline9tests PASS0failed/skipped, bootJar PASS in38s in THIS environment. Then targeted2decimal tests FAIL as above (13s), establishing pre-fix reproduction. Expanded13suite PASS after strict coercion/list/rollback changes. Final full suite after authoritative0.3 contract, payment-state projection, CSRF and approval observation:

`JAVA_HOME=<existing verified JDK21> V3_MYSQL_TEST=true V3_DB_URL=jdbc:mysql://localhost:13306/ticketing_v3_issue1_test?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true V3_DB_USER=<localfixture> V3_DB_PASSWORD=<secure process binding> <verifiedGradle8.14.3>/bin/gradle -p backend test bootJar --rerun-tasks --no-daemon --max-workers=2` with managed JVM proxy and systemCA properties from backendREADME.

Result BUILD SUCCESSFUL37s; ModuleBoundary1 + BookingMvpIntegration12 + CatalogHTTP1 + CatalogService1 =15executed,0failed/errors/skipped. JUnit timestamps2026-10-29T07:10:34..07:11:03UTC. Actual100distinct HTTP registered+logged-in buyers:1winner99conflicts391ms; MySQL exactly1activehold/ownedseat verified. Concurrent10identical hold keys and10payment keys persist one hold/payment/reservation. This is correctness evidence, NOT TPS/p95/load guarantee. Existing expiry/new-owner protection, owner/CSRF checks, mockfailure/no-retry, idempotency mismatch/replay, cross-session independence and legacy preservation all rerun.

Added stale-CSRF test checks pre-login token invalid after session rotation, wrong password401 with no sensitive response, BCrypt persisted not plaintext, logout invalidates prior session, and stale token cannot login again. No new auth policy. Added approved-performance session creation OBSERVATION:201, approval remainsAPPROVED, publicdetail shows thirdsession. Test records current behavior; re-review policy remains unresolved and unchanged.

`git diff --check` PASS. Build/test logs and currentJUnit XML reside in ignored backend/build; report contains no credentials/cookies/CSRF.

## Runtime for coordinator browser validation
Final tested bootJar SHA256d65fe1fe64dbb61c2789de8ed742e2cad23a095f1acd5cce9b9d53c41508dc91 copied and rehashed at /workspace/shared/issue1-runtime/<sha>.jar. Baseline own18080 process stopped, final immutable jar started18080 on issue1_appDB. Do not rebuild/overwrite a running jar. Local trusted provisioning can use same immutable artifact and appDB binding; production and oldDB untouched. Actual browser E2E/UX/performance-gate measurements owned by coordinator, not claimed here.

## Remaining policy decisions / limits
Approved performance's session additions currently remain published; whether re-review is required needs user decision. Cancellation/refund/resale/payment retries/role transitions/global hold quota/seat grading unchanged and not implemented. Performance row gate serializes holds/payments across one performance; benchmark/lock-scope analysis delegated coordinator, no speculative lock-strategy rewrite or infrastructure introduced. No production HTTPS/load/fullpenetration-test claim.

## Continuation after pause — current 19:51–19:52 KST verification
Existing container remained Up with original volume; managed daemon inspection required no restart/reset. Verified immutable artifact SHA256d65fe1fe64dbb61c2789de8ed742e2cad23a095f1acd5cce9b9d53c41508dc91 before restarting backend18080 from that copy against ticketing_v3_issue1_app. Actual public GET /api/performances200 returned preserved QA catalog. No user data or volume deleted.

Reran the same full command above with `test --rerun-tasks --no-daemon --max-workers=2` (no bootJar overwrite) after process recovery. Result BUILD SUCCESSFUL43s. Current JUnit XML UTC timestamps2026-10-29T10:52:07..10:52:37: ModuleBoundary1 + BookingMvpIntegration12 + CatalogHTTP1 + CatalogService1 =15executed,0failures/errors/skipped. Actual100distinct authenticated HTTP competitors again gave1winner99conflicts,456ms observed batch, with DB final-owner assertions. Concurrent10same-key hold/payment and all extended Issue1 regressions reran. Source transaction/security review found no further confirmed defect requiring unrelated changes; existing approval-after-session-add behavior remains an observation, not a newly approved re-review rule.

Live server process was launched only from the immutable copy; final browser UX/benchmark evidence remains coordinator-owned. Old07:11 test observations are historical, not substituted for this current rerun.
