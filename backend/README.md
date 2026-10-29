# Ticketing V3 backend

Java21 **JDK** required; system runtime was JRE-only. Verified local JDK retained in backend worktree ignored `.tools/jdk-21.0.8+9`; verified Gradle8.14.3 in `.tools/gradle-8.14.3`. Committed wrapper pins distribution SHA256. Boot4.0.0 BOM pins dependencies.

From backend/: `./gradlew test bootJar --no-daemon --max-workers=2`. Managed network dependency downloads require supported JVM proxy properties `-Dhttps.proxyHost=proxy -Dhttps.proxyPort=8080 -Dhttp.proxyHost=proxy -Dhttp.proxyPort=8080 -Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts`. Keep TLS verification enabled; set JAVA_HOME to JDK21.

Set V3_DB_URL, V3_DB_USER, V3_DB_PASSWORD to V3-only MySQL; start `java -jar build/libs/ticketing-v3-backend.jar`. Default URL localhost:13306/ticketing_v3 with UTC connection/session time; server18080. Flyway applies additive migrations; Hibernate validates mapped entities. No DB reset commands. Local disposable MySQL fixture uses passwordless root bound loopback only; never use that deployment configuration. Production HTTPS requires V3_COOKIE_SECURE=true. Cookie HttpOnly/SameSite=Lax; frontend same-origin proxy routes /api to backend.

Trusted seller/admin provisioning creates NEW accounts only: set V3_PROVISION_EMAIL, V3_PROVISION_PASSWORD, V3_PROVISION_ROLE=SELLER or ADMIN securely in process environment, same V3_DB_* binding, then `java -jar build/libs/ticketing-v3-backend.jar --spring.main.web-application-type=none --spring.profiles.active=provision`. Do not preregister these emails as buyers. No existing role mutation or public privilege endpoint. Do not commit secrets or log process environment.

Buyer registration always BUYER. Fetch /api/auth/csrf, keep session cookie and send returned X-CSRF-TOKEN on mutations. Login rotates session and clears token; refetch CSRF after login/logout. All endpoints/DTOs follow root docs/api/openapi.yaml0.2.

Real MySQL tests: create a **separate new V3-only** database, set V3_MYSQL_TEST=true and V3_DB_URL pointing to it, supply local V3_DB_USER/PASSWORD, then `./gradlew test --rerun-tasks --no-daemon --max-workers=2`. Test fixture names are unique and no DROP/reset is used; old isolated catalog test inserts/deletes only its own fixed fixture rows. Default runs skip MySQL classes and must not be reported as database validation. Full suite includes exactly100distinct buyers registered/logged-in HTTP concurrency (1winner), atomic multiseat rollback, expiry/ownership, idempotency including concurrent10replays, simulated success/failure and authorization/CSRF. Run with enough memory for Spring/Tomcat100requests. JUnit reports under build/test-results/test.

Feature modules: auth, venue, performance, seat, reservation, payment; global infrastructure only. Public service boundaries and acyclic imports enforced by ModuleBoundaryTest. JPA normal auth/venue CRUD; explicitSQL integrity transitions/projections. Performance row locks deliberately serialize hold/checkout sale validation. This correctness-first choice needs profiling before throughput claims.

No cancellation/refund/resale/live PG/payment-retry/role-transition endpoints. Failure retains original hold TTL; replay identical failed request works, a different key retry returns409 POLICY_NOT_ENABLED. Hold TTL300seconds and1..4distinct seats; no inferred global active-hold quota.

Swagger UI is included with pinned springdoc3.0.0: GET /swagger-ui/index.html. It loads /api-contract.json packaged from reviewed root docs/api/openapi.yaml during processResources; /v3/api-docs/swagger-config points to that contract. Security permits GET docs only, mutations still require CSRF/auth/roles.

**Live build safety:** copy bootJar to a distinct content-addressed runtime path before starting server or trusted provisioning; do not execute build/libs jar while another Gradle task can overwrite it. Build SHA256 and runtime copy must match. Recovery validation used immutable artifact in /workspace/shared/runtime-builds/. Existing MySQL container+volume survived recovery and were restarted without resets; report current SQL readiness separately from source/commit recovery.

Issue1 QA: JSON floating-point tokens are rejected for integer seat IDs/counts/KRW rather than silently truncated. GET /api/holds returns only the current authenticated user's ACTIVE unexpired holds ordered by id; GET/list projections include nullable persisted paymentStatus so refreshed clients can avoid presenting an unsupported payment retry after FAILURE. This read addition sets no global hold quota or cancellation/retry policy.
