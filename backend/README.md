# V3 backend: catalog slice
Java 21 **JDK** required (system image currently has JRE only). Gradle wrapper 8.14.3 with distribution SHA256 is committed. Spring Boot 4.0.0 BOM pins transitive dependencies. Uses Spring Web MVC/JPA/Security/Flyway and MySQL 8.4.7.

Run from backend/: `./gradlew test bootJar --no-daemon --max-workers=2`.
In this managed environment JVM dependency downloads require `-Dhttps.proxyHost=proxy -Dhttps.proxyPort=8080 -Dhttp.proxyHost=proxy -Dhttp.proxyPort=8080 -Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts`. Keep TLS verification enabled. Set JAVA_HOME to an installed Java21 JDK. A checksum-verified local JDK and Gradle are retained in ignored `.tools` in backend worktree; do not commit them.

Set `V3_DB_URL`, `V3_DB_USER`, `V3_DB_PASSWORD` to a **V3-only** MySQL instance, then `java -jar build/libs/ticketing-v3-backend.jar`. Defaults: localhost:13306/ticketing_v3, backend18080. Explicit empty password is only for isolated local test MySQL bound to loopback; never use in production. Production HTTPS must set V3_COOKIE_SECURE=true. Do not log credentials.

Integration test is deliberately gated: `V3_MYSQL_TEST=true V3_DB_USER=root V3_DB_PASSWORD= ./gradlew test --rerun-tasks` against an **empty disposable V3** DB. The test inserts/deletes only its own rows and expects no other approved catalog rows for its empty-state check. Default tests do not claim MySQL readiness when this test is skipped.

`GET /api/performances` is public and approved-only. Every other request is denied; CSRF remains enabled. Login/roles/seat/payment are not implemented. No seed rows in production migrations. Catalog prices and venue name are transitional read-model fields; they are **not** authoritative SessionSeat prices or the final normalized venue/session model. Booking implementation needs separately reviewed migrations/policies.
