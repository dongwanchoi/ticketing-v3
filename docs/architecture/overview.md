# Architecture
Single deployable Spring MVC modular monolith; auth, performance, venue, seat, reservation, payment and global packages. Modules own their tables and repositories; callers use public services, never mutate foreign entities/repositories. No cyclic module dependencies. Controllers validate DTOs; services own transactions; domain enforces invariants. Architecture tests must verify actual boundaries as modules are added.
Frontend Next.js App Router uses same-origin /api reverse proxy. Server session HttpOnly cookies, CSRF on mutations, Secure in HTTPS production. UTC persisted/server time, Asia/Seoul display; integer KRW. First slice is read-only; no claims about implemented authentication yet.
Seat conditional UPDATE + affected row count, unique constraints and transaction rollback are proposed integrity strategy; detailed hold schema awaits policy approval. No Redis/Kafka/Kubernetes default.

## Implemented vs proposed
Only performance catalog and global security/error handling exist in this first slice. Other modules and boundary verification tests are planned. Existing package separation alone is not evidence of a completed modular monolith. Public GET is allowed and all other paths denied; real login/session lifecycle/role authorization/CSRF token issuance are not implemented.
