# Backend — recovered runtime, legacy safety and Swagger UI

This report supersedes the prior unavailable-runtime uncertainty. On resumption `git log` confirmed complete MVP commit **c200e45** persisted and working tree was clean. Only existing Backend Worktree `feat/backend-v3` used. Main/V1/V2 unchanged.

## Runtime and data recovery evidence
Read managed runtime/network/Docker guidance and current policy. Runtime status observations current/running, network enforced. Inspected managed local daemon explicitly and all containers/images/volumes before mutation: MySQL8.4.7 image retained; `ticketing-v3-catalog-mysql` existed but exited255, original anonymous `/var/lib/mysql` volume retained. Started that SAME V3-only container without recreating/resetting/deleting anything. SQL verified original `ticketing_v3` and separate `ticketing_v3_mvp_test` each13tables, original catalog2performance rows, successful Flyway1+2. No DB DROP or existing-row reset.

## Reviewed fixes and rationale
Ownerless legacy catalog rows intentionally retain null owner/venue/description. Existing query COALESCE already maps public detail description to empty string; no artificial owner/venue backfill is introduced. Administrator managed list now excludes ownerless/venueless rows so required ManagedPerformance.venueId is non-null; direct review of such legacy rows returns404 and cannot change their prior approval. Public approved catalog/details remain usable, no sessions invented. Alternative nullable managed contract would expose unmanageable historical rows and require shared schema changes, so filtering and explicit mutation denial were selected. Regression checks row preservation in MySQL, approved public search/detail with empty description/sessions, admin exclusion and404mutation denial.

Security input review confirmed missing/invalid email and oversized BCrypt input receive400 rather than500, registration ignores client role escalation, exact roles and CSRF remain enforced. Existing ownership/auth/payment/expiry/transaction regression suite rerun unchanged. No pending policy was silently introduced.

Springdoc `org.springdoc:springdoc-openapi-starter-webmvc-ui:3.0.0` verified through published MavenCentral POM, resolved/built and tested with actual Boot4.0.0 application. Adds Swagger UI without a separate docs frontend; alternatives plain OpenAPI file/Redoc reduce backend dependencies but lack requested interactive Swagger UI. Cost is extra runtime dependencies and Boot/springdoc compatibility to maintain. Gradle packages reviewed root contract as `/api-contract.json`; Swagger UI points to it rather than treating inferred annotations as authority. Public GET-only docs routes; no CSRF exemption or mutating endpoint access added. Live verification fetched Swagger config, asserted url=/api-contract.json and JSON equality with source OpenAPI. HTML endpoint also tested. This was actual startup verification, not a compatibility claim based only on version naming.

Performance row FOR UPDATE deliberately serializes approval/sale checks with hold/checkout across sessions. This is correctness-first conservative locking with throughput cost; shared FOR SHARE lock plus audited mutation ordering is a possible future optimization. No performance/TPS guarantee is made from these tests.

## Current executed validation
From `/workspace/ticketing-v3-backend`, JAVA_HOME=backend/.tools/jdk-21.0.8+9, V3_MYSQL_TEST=true, V3_DB_URL targeting preserved **separate** ticketing_v3_mvp_test on loopback13306, local fixture bindings V3_DB_USER=root and explicitly empty V3_DB_PASSWORD, ran:
`backend/.tools/gradle-8.14.3/bin/gradle -p backend -Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts -Dhttps.proxyHost=proxy -Dhttps.proxyPort=8080 -Dhttp.proxyHost=proxy -Dhttp.proxyPort=8080 test bootJar --no-daemon --max-workers=2`
Passwordless local fixture is loopback-only and not production guidance. No real credentials logged or committed.

Latest run **BUILD SUCCESSFUL36seconds**,9executed/0failed/0errors/0skipped. JUnit XML timestamps06:22:54..06:23:19UTC from CURRENT recovered runtime:
- BookingMvpIntegrationTest6 (includes legacy/docs/input regressions plus prior complete MVP, transactions and security scenarios).
- ModuleBoundaryTest1; catalog real MySQLHTTP1; service1.
- Exactly100distinct buyers registered+logged in via HTTP, barrier100HTTP seat competition: **1winner99conflicts**, final DBsingle owner/ACTIVE hold verified; elapsed296ms. Correctness test only.
-10concurrent same-key holds and10concurrent same-key successful payments replay same responses; unique DBhold/payment/reservation assertions pass.

## Immutable runtime artifact and remaining ownership
An initial live Swagger config request reset while a build rewrote the running jar. Diagnosed lazy classloading from mutable build output; final server and provisioning must use immutable content-addressed copy, never a jar overwritten by builds.
Final verified SHA256 artifact `/workspace/shared/runtime-builds/460ece8767c5449c8d9d49a85f23d6270d6e9136ae0503d24645cff2b511253e.jar`. Runtime backend18080 started from this COPY (PID3692/session83761), binding preserved `ticketing_v3` catalog DB on13306, original rows retained; Flyway reports schema up-to-date. Live docs/config/source equality checks pass. Future startups must recheck service/process readiness; processes are not durable snapshot state.
Coordinator owns final browser integration/provisioning evidence, dev integration/push and final report. This backend report does not claim browser E2E success, infrastructure publication or main merge.
