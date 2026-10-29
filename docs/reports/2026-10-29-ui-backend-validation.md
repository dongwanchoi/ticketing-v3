# UI redesign — Backend preservation and current regression validation

Date: 2026-10-29 KST. Role: Backend validation. Baseline `dev@1b8912409aaafef37f09add9ce32aa97dc4a6199`; worktree `/workspace/ticketing-v3-ui-backend`, branch `qa/ui-redesign-backend`.

## Scope and safety
No backend source, API contract, tests, dependency declarations or migration files were changed. `git diff --exit-code 1b89124 -- backend docs/api/openapi.yaml` succeeded before and after validation. This role owns only this report. The frontend design and reference-browser observations belong to the coordinator/Frontend role; no claim about final redesigned UI quality or browser E2E is made here.

Read managed runtime/network/Docker instructions and current policy first. Current managed status running/network enforced; existing local Docker28.4.0 daemon healthy. Existing `ticketing-v3-catalog-mysql` was already Up6hours, MySQL8.4.7, loopback13306; it was reused without restart, removal or volume replacement. SQL confirmed the original V3 schemas remained present. Added only separate new `ticketing_v3_ui_app` and `ticketing_v3_ui_test` with CREATE DATABASE IF NOT EXISTS. Existing V3, Issue1, V1/V2/reference databases and containers were never reset or modified by this role.

The local fixture binding was verified by actual read-only SQL before use; no secret/credential files or full environment were dumped. The existing isolated loopback fixture is not a production credential configuration.

## Actual current commands and results
Executed in this worktree with retained checksum-verified tools:

- JDK `/workspace/ticketing-v3-backend/backend/.tools/jdk-21.0.8+9` for compilation; Gradle8.14.3 from the same ignored `.tools` directory.
- Set V3_MYSQL_TEST=true, V3_DB_URL=`jdbc:mysql://localhost:13306/ticketing_v3_ui_test?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true`, and existing local V3_DB_USER/PASSWORD process bindings. Ran verified Gradle `-p backend test bootJar --rerun-tasks --no-daemon --max-workers=2` with `-Dhttps.proxyHost=proxy -Dhttps.proxyPort=8080 -Dhttp.proxyHost=proxy -Dhttp.proxyPort=8080 -Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts`. TLS/checksum verification remained enabled.
- Result: **BUILD SUCCESSFUL in46s**,6tasks executed.
- Current JUnit XML timestamps 2026-10-29 22:04:36–22:05:13 KST (machine XML13:04:36–13:05:13UTC): ModuleBoundary1 + BookingMvpIntegration12 + CatalogHTTP1 + CatalogService1 = **15executed,0failures,0errors,0skipped**.
- Actual100different registered-and-logged-in HTTP buyers competing for one session seat: **1winner,99conflicts**, DB final activehold/ownedinventory checks passed. Observed630ms batch is correctness evidence, not TPS/p95 assurance.
- Existing tests re-exercised same-key concurrent10hold/payment replay uniqueness, actual multiseat partial rollback, max4 and invalid/fractional integer input rejection, expiry/new-owner protection, cross-session seat independence, payment success/failure and unsupported new-key retry, owner-scoped active hold list with FAILED payment state, CSRF/session invalidation, seller ownership/admin self-review denial, public/legacy compatibility and module boundaries.
- `git diff --check` passed; backend and reviewed API remained byte-for-byte baseline equivalent.

No current test failures or skipped MySQL targets remain. Previous Issue1 test output was not substituted for this fresh run.

## Immutable runtime for actual UI verification
Copied the tested bootJar to content-addressed path and independently rehashed it:

`/workspace/shared/ui-redesign-runtime/f866ba3e6ea9e5d05103e4b6dadadfcb8c6a3ccee92fdd82ba87826c740b8909.jar`

SHA256 `f866ba3e6ea9e5d05103e4b6dadadfcb8c6a3ccee92fdd82ba87826c740b8909`.

With coordinator approval, stopped only the known previous V3 QA Java PID12418. MySQL and reference services were not touched. Started the immutable copy with V3_DB_URL pointing to `ticketing_v3_ui_app`, same confirmed local fixture user/password binding, default V3 server18080. New runtime PID20861/session72422, Java runtime21.0.12.1, startup6.421s. Do not rebuild/overwrite that running artifact.

Actual readiness check `curl --fail .../api/performances` returned200 and `{"items":[]}`. Read-only SQL confirms both UI schemas13tables; app Flyway versions1/2 both success. Baseline migrations were applied only to the new UI app schema, and Hibernate validation succeeded. No new schema definition or API behavior was introduced.

Trusted seller/admin provisioning can use this immutable artifact and the same UI-app binding. Generate new test accounts; never overwrite existing roles or delete old fixture data. Coordinator's frontend uses13000; reference rendering is on separate13100/18180 and was not accessed by this role.

## Validation limits
Backend/MySQL preservation and regression checks PASS. Redesigned visual comparison, screenshot review,390/768/1440geometry, keyboard/dialog flows and full Chromium→redesigned frontend→API→MySQL journeys are **NOT RUN by this role** and must be supported by coordinator evidence. No production deployment/HTTPS/load assurance, real PG or policy changes were added. Approved-performance session re-review, cancellation/refund/resale/payment retry, role transitions and aggregate hold quotas remain unresolved as before. No main push/merge or environment publication performed.
