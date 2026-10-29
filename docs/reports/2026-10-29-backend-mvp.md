# Backend Agent — complete functional MVP

Worktree `/workspace/ticketing-v3-backend`, branch `feat/backend-v3`. Read OpenAPI0.2 and docs/api/mvp-semantics.md before implementation. Changes limited to backend/** and backend role reports. No V1/V2 access/mutation, main push/merge or destructive DB actions.

## Implemented
- Buyer registration (ignores attempted client role escalation), BCrypt credentials, session login with session ID rotation, logout invalidation, CSRF token endpoint and protection on every mutation, exact seller/admin roles. Session cookie HttpOnly/SameSite=Lax, Secure via V3_COOKIE_SECURE for HTTPS.
- Trusted non-web provision profile creates NEW seller/admin only from environment variables. No public privilege elevation endpoint or existing-user role transition.
- Owned venues and physical row/number seats, owned performances, independent sessions and inventory, one shared sale row with paired/null date checks. Seller ownership and admin self-review prohibition. Public case-insensitive title search, approved-only details/session counts/prices. Individual inventory requires login.
- Atomic1..4distinct-seat holds,300second TTL and server-derived price/user/time. Sorted conditional SQL updates with affected-row validation; whole-transaction rollback on partial conflict. Effective expiry in read models, owner/hold-conditioned release, expired-old-owner confirmation prevention. No unauthorized quota/cancellation/resale introduced.
- MySQL-persisted SHA256 request fingerprints and user+operation+key unique idempotency records. Upsert locks conflicting keys before reading response, avoiding exception/replay inside rollback-only transactions; successful responses replay, different payload409.
- Simulated success atomically books inventory and creates unique reservation/payment; failure creates failed payment with no reservation/booking and retains hold TTL. Same-key replay supported; different-key retry after failed payment409 POLICY_NOT_ENABLED. Current-user-only reservation history.

## Layering and decisions
JPA remains default for ordinary auth and venue/physical-seat CRUD (mapped UserEntity/Venue/Seat plus existing Performance mapping). ExplicitSQL for conditional seat updates, idempotency lock protocol, transactional booking/payment writes and multi-table catalog projections makes affected-row/lock behavior auditable. Alternative all-JPA locking brings entity lifecycle/flush ordering complexity at these integrity boundaries; cost is handwritten SQL/MySQL coupling. Performance management SQL provides consistent locking on the shared sale/approval row and projection aggregation; JPA management alternative remains viable but would require auditing lock/flush ordering. Future performance work must measure this deliberate performance-row serialization before changing locking strategy.

Actual feature DAG: payment→reservation→performance→venue/seat; controllers also depend on auth. No foreign-feature repository/entity imports. Foreign-table read joins are projections only; mutations stay in owning modules. Source architecture JUnit gate validates public service imports and rejects cycles. Global SQL insert helper/idempotency infrastructure shared, not business repositories. DIP is selective: interfaces are not added to every CRUD class; Clock is injectable UTC for timing boundary. Integer KRW throughout; seat/session inventory is now authoritative price source (legacy catalog fields preserved only as fallback for historical initial catalog rows).

Versions unchanged from catalog report: Boot4.0.0, Gradle8.14.3, JDK21, MySQL8.4.7, Boot-managed JUnit6. No Redis/Kafka/Kubernetes. New dependencies were unnecessary. Flyway11.14.1 emits a warning that its latest verified MySQL version is8.1; actual8.4.7 migrations/CRUD/constraints/integration were executed successfully. This warning is not hidden or treated as vendor certification.

## Executed validation and evidence
Ran from worktree root with JAVA_HOME=backend/.tools/jdk-21.0.8+9, verified Gradle8.14.3, system CA trust and supported JVM proxy properties:
`V3_MYSQL_TEST=true V3_DB_URL=<separate ticketing_v3_mvp_test JDBC URL on loopback13306> V3_DB_USER=root V3_DB_PASSWORD= gradle -p backend test bootJar --no-daemon --max-workers=2`
Disposable fixture passwordless root is loopback-only; not production configuration. No real credentials recorded. Separate `ticketing_v3_mvp_test` DB created additively, existing `ticketing_v3` DB untouched during tests. Tests use unique fixture IDs and preserve prior runs; no DROP/reset.

Final run: BUILD SUCCESSFUL35seconds. Current JUnit XML7executed,0failed,0errors,0skipped:
- BookingMvpIntegrationTest4: public discovery/details/inventory; seller ownership; own-admin approval denial; role and CSRF denial; session rotation/logout; sale validation; successful payment/history; sequential and concurrent idempotency/mismatch; failed-payment no-retry; old-expiry/new-owner protection; multiseat rollback; same physical seat independent across sessions; max4/duplicates validation.
- Actual100distinct buyers registered/logged in via HTTP, barrier-released100HTTP competing holds: **1winner99conflicts**, DB inventory single owner and single ACTIVE hold asserted.351ms elapsed for selected run; correctness evidence only, no100TPS/p95 claim.
-10concurrent identical hold keys return same hold;10concurrent identical payment keys return same payment; DB asserts one hold/payment/reservation.
- ModuleBoundaryTest1; existing catalog HTTP/MySQL1 and catalog service1 also pass.

Intermediate JPA refinement exposed closed ResultSet on getResultStream outside transaction; fixed eager result materialization and reran full suite. Do not count the failed intermediate run as passing. System JRE/JDK/proxy/download troubleshooting remains in earlier catalog report.

## Runtime and remaining validation
New jar running18080/session65389 against existing V3 `ticketing_v3` DB on13306. Additive FlywayV2 applied; original approved browser catalog fixture remains. No old containers stopped; only own prior catalog Java PID4108 stopped and replaced. Coordinator performs full real-browser integration and contract validation separately; this report does not claim those runs.

Backend README has reproducible setup/start/provision/test instructions. Swagger UI/tooling pending coordinator decision; root OpenAPI is authoritative. Optional cancellation/refund/resale/payment retry/seat-grade policies remain unimplemented by design. No live PG/card data. Application supports complete approved functional MVP; deployment/security at an actual HTTPS origin still requires deployment-specific validation.
