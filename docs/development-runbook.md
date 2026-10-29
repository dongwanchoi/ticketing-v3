# Reproduce V3 development and validation

Use existing checkouts; no reset/clean, no new project, no main changes. Worktrees are for the explicitly requested three-role workflow only. Java21 JDK, Node24, Docker and system Chromium are required. Backend worktree retains checksum-verified JDK/Gradle under ignored backend/.tools. Root frontend and integration dependencies are lockfile-pinned.

## Preserve and start database
Inspect managed Docker via `env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock ps -a`. On this restored environment the existing container is ticketing-v3-catalog-mysql; `docker start ticketing-v3-catalog-mysql` restarts it with its original data volume. Never recreate/delete its volume. Host binding is loopback13306, MySQL8.4.7. If container/storage is missing, report it and create only a separate new V3 fixture when appropriate; never point tests at V1/V2.

Existing application database ticketing_v3 and isolated test database ticketing_v3_mvp_test were recovered. All new schema changes use Flyway migrations and Hibernate validation. No DROP/reset is required. Test fixtures are namespaced/unique; tests must target the isolated test database, never existing application data. The old catalog test deletes only its own fixture rows.

## Backend
From `/workspace/ticketing-v3-backend`, use JDK21 and verified Gradle (see backend README/report). Set V3_MYSQL_TEST=true, V3_DB_URL to `jdbc:mysql://localhost:13306/ticketing_v3_mvp_test?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true`, V3_DB_USER/PASSWORD to the local fixture binding, and run `gradle -p backend test bootJar --rerun-tasks --no-daemon --max-workers=2`. Managed JVM dependency downloads require inherited proxy route and system Java CA trust as documented in backend/README.md. Passwordless root is only the existing isolated loopback test fixture, never a deployment recommendation.

Verify JUnit XML belongs to current run and no MySQL suite was skipped. Freeze resulting bootJar to a SHA256-named path outside build output and start THAT copy: set V3_DB_URL to application ticketing_v3 binding, V3_DB_USER/PASSWORD securely, then `java -jar <immutable-jar>`. Never rebuild/overwrite a running jar; lazy class loading can fail. Backend18080. Swagger UI serves the packaged reviewed OpenAPI, not an independently divergent contract.

## Frontend and fixtures
From `/workspace/ticketing-v3/frontend`: `npm ci`, `npm test`, `npm run typecheck`, `npm run build`, `npm start`. Frontend13000, same-origin /api proxy to18080; backend origin overrides must be set before build. No production mock fallback.

From `/workspace/ticketing-v3/tests/integration`: `npm ci`; `npm run prepare:accounts` writes fresh random credentials only to a private /tmp file, then set V3_BACKEND_JAR to immutable jar and the same V3_DB_* application binding and run `npm run provision:fixtures`. This creates NEW seller/admin accounts through trusted local CLI, not public role elevation. Buyer is registered through browser. No fixture credentials are committed/logged.

Run `npm run test:mvp` for actual seller venue/performance/2sessions/sale → admin approval → buyer signup/login/search/detail/seat hold/mock payment/history, cross-session seat independence, failed payment and explicit release, mobile390px and actual OpenAPI DTO response validation. Generate NEW accounts before a repeat run if buyer registration previously completed; preserve prior fixture rows. `npm run test:architecture` validates feature import boundaries. `npm test` is the separate public catalog browser smoke.

## Limits and future tasks
Current correctness tests are not a TPS/p95 performance guarantee. Production deployment needs HTTPS/cookie configuration, secure DB credentials and operational review. Cancellation/refund/resale/new-payment retry, public role transitions/seat grades/global hold quota and paid infrastructure remain deferred; they are not silently authorized by test fixtures. Sessions/processes must restart after environment recovery; filesystem presence alone is not readiness.
