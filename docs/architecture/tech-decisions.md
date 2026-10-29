# Technology decisions
Each entry records reason/problem; alternatives; downside/cost; adoption condition; verification.
- Java 21 / Spring Boot 4 / Gradle: typed transactional modular backend; alternatives Kotlin/Maven, Node; JVM startup and toolchain cost; supported Java21 build required; verify build/test and official published dependency metadata, record exact versions in backend report.
- MySQL 8 InnoDB / Flyway / JPA: relational constraints and versioned schema; PostgreSQL/JDBC alternatives; container cost and locking complexity; V3-only schema and supported driver required; verify MySQL integration tests. Explicit SQL reserved for conditional seat operations.
- Next.js16 / React19 / TypeScript5 / Tailwind4: typed responsive App Router UI; Vite/React and CSS modules alternatives; framework/runtime coupling; official peer/engine compatibility required; lock exact dependencies and verify typecheck/build/tests.
- OpenAPI3 REST: shared DTO/error/auth boundary before parallel work; GraphQL/code-first alternatives; contract drift cost; validate schema and compare actual API responses.
- Cookie session + CSRF: avoids browser token storage; bearer tokens alternative; CSRF and proxy deployment complexity; validate real browser cookie/security flows before claiming ready.
- JUnit / integration tests and frontend component tests: exercise behavior; alternatives manual-only and E2E-only; test maintenance cost; use meaningful cases. MySQL Testcontainers only if daemon available. E2E requires real services/browser.
No unverified compatibility or unexecuted test is considered success.

- Integration validation: swagger-parser12.1.0 validates OpenAPI references/schema; playwright-core1.58.2 drives installed Chromium without browser download. Alternatives manual curl or full bundled Playwright: curl cannot validate client rendering and bundled browsers add download size. Cost: browser binary must exist; tests need running services. Adopt for actual catalog UI→proxy→API assertions, mobile overflow and explicit expected/hidden fixtures; no mock transport interception.

## Verified versions / deviations
Backend uses SpringBoot4.0.0, Gradle8.14.3, Temurin JDK21.0.8+9 (system21 JRE lacks compiler), MySQL8.4.7 and Boot-managed JUnit6. JUnit5 override deferred to avoid unverified BOM divergence; see backend report for official metadata/checksum evidence and limitations. Frontend exact Next16.4.3/React19.3.1/TS5.9.3/Tailwind4.3.3 validated against registry peer/engine metadata and build. TS strict application checking passes with Next standard skipLibCheck; vendor declaration checking is not claimed. Full reasons/alternatives/costs are in each role report.
