# Backend Agent — public catalog slice

Branch `feat/backend-v3`; worktree `/workspace/ticketing-v3-backend`; ownership `backend/**` and this report only. No V1/V2/main changes. Implements `GET /api/performances` approved-only DTO catalog, transactional read service, JPA repository, MySQL Flyway schema/check constraints/index, denial of every other endpoint, CSRF enabled and HttpOnly session cookie defaults. No login or booking implementation claim.

## Actual environment and versions
System Java21 was JRE-only, so first compile failed toolchain discovery. Downloaded official Adoptium Temurin21.0.8+9 JDK, verified release SHA256 before extraction into ignored backend/.tools. Gradle8.14.3 ZIP SHA256 verified against downloads.gradle.org, wrapper generated with distributionSha256Sum. SpringBoot4.0.0 official Maven BOM resolved and Java21 compilation verified; Boot Gradle plugin resolved from MavenCentral. `docs.spring.io` system-requirements fetch returned403; no claim it was read. Initial plugin fetch failed without JVM proxy; fixed using inherited proxy route via JVM properties and system CA trust, never disabled TLS verification. Test annotation initially used wrong package; corrected after inspecting actual Boot jar.

MySQL8.4.7 image digest `sha256:0426ec38c7a10aa45ba383887df7878f74ee70e2fd589c7b69207f3577901903`. V3-only disposable container `ticketing-v3-catalog-mysql`, loopback13306, database ticketing_v3; no existing containers stopped. Local test instance uses passwordless root strictly loopback and is not a deployment configuration. No credentials committed.

## Design reasoning, alternatives and costs
- Java21/Boot4 MVC/JPA: matches requested stack, transactions and compile-time types. JDBC-only alternative has less ORM machinery but manual mapping. Gradle8.14.3 supports toolchain and Boot build verified here; Maven alternative would diverge requested build system.
- MySQL/Flyway: actual schema validation and migration exercised. H2 alternative rejected as substitute evidence because dialect/constraint differences hide MySQL failures. Direct disposable Docker instance chosen instead of Testcontainers for initial slice to minimize harness complexity; portability cost is explicit external lifecycle. Later tests should adopt Testcontainers when broader DB fixtures require isolation.
- Boot4-managed JUnit Jupiter6 chosen rather than overriding BOM with JUnit5; avoids unverified managed-stack mismatch, downside differs from suggested JUnit5. Future override requires its own compatibility check.
- Deny-by-default security with public GET exception prevents implying login is implemented; generated-user autoconfiguration disabled. Authentication/role boundary tests remain future work.
- Current table is a transitional catalog read model: copied venue name and min/max KRW are not final authoritative seat prices. Full normalized Venue/SessionSeat ownership requires separately reviewed migrations before booking. This is a documented limitation, not completed ERD/MVP.

## Actual validation
Executed verified Gradle binary with JAVA_HOME pointing to verified JDK, system CA trust, proxy JVM properties, V3_MYSQL_TEST=true, V3_DB_USER=root, explicitly empty V3_DB_PASSWORD:
`gradle -p backend test bootJar --no-daemon --max-workers=2`

Current run JUnit XML: CatalogMySqlIntegrationTest1 + CatalogServiceTest1; 2 executed, 0 skipped, 0 failures/errors. Real Spring random-port HTTP + real MySQL verifies approved visibility, PENDING/REJECTED invisibility, integer KRW response field, empty JSON response, unrelated GET403, POST403. Flyway migration and Hibernate validate both succeeded. `bootJar` built. Final rerun after excluding generated-user autoconfiguration also passed: BUILD SUCCESSFUL in11s, same2tests executed with0failures and0skipped.

## Changed files and remaining scope
All backend build/wrapper/application/migration/tests/README files plus this report. Wrapper JAR is tracked; .tools/.gradle/build/.env ignored. Backend README gives working-directory, JDK, proxy, DB, run and gated-test instructions. Hold5-minute TTL/maximum4seats approval received via coordinator, but **not implemented**. No reservations, payments, seller/admin management, 100-user race test, Swagger UI or cross-module architecture tests implemented in this catalog slice. Next: contract-approved session/detail read model; hold lifecycle only after revised shared contract.
