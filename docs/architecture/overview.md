# Ticketing V3 architecture
Single Spring MVC deployment with feature modules auth, venue, performance, seat, reservation, payment and shared global infrastructure. Controller → service(transaction) → owned repository → domain/DTO. Cross-feature calls use public services; repositories are never imported across feature boundaries. Java import graph tests reject cycles; global security/SQL utility infrastructure is explicitly excluded. Runtime transaction and MySQL integration tests complement this static check; folders alone are not evidence.

Dependency DAG: payment → reservation → performance → venue/seat; feature controllers use auth public service for current identity. Global contains error/security, UTC Clock, transaction-scoped idempotency and SQL helpers. JPA maps auth/venue/physical seats and original catalog; explicit SQL controls inventory transitions, aggregate projections, hold/reservation/payment persistence. API DTOs/records/maps do not expose JPA entities.

## Integrity and transactions
SessionSeat primary key(session_id, seat_id) gives each session independent inventory. Claims use conditional UPDATE and affected-row checks in stable seat order; the outer transaction rolls back all seats on failure. Reclamation checks previous hold expiry; release/confirmation compare hold ownership. Hold expiry is server now+300seconds; effective expiry is enforced on use/read/reclamation, without requiring a background timer for correctness. A lazy status may remain persisted ACTIVE until use, but expired inventory is available for reclamation and cannot be paid.

Performance row locking serializes sale/approval validation with hold/payment transactions. This conservative scope also serializes different seats on the same performance: correctness is verified, throughput scalability is not. Alternative shared gate locks/finer locks require lock-order and race regression testing before optimization.

Idempotency MySQL primary key(user_id,operation,key) plus request fingerprint, insert-on-duplicate and locked response row prevent concurrent duplicate actions. Payment and reservation are unique per hold. Mock success checks owner/expiry/sale and atomically books inventory, records reservation/payment; failure records payment without booking. Different-key retry for failed payment is unsupported, not an approved retry policy. No cancellation/refund/resale path exists.

## Browser/security/time
Next App Router uses same-origin /api rewrite to Spring; no production mock fallback. Server sessions rotate on login and invalidate on logout; BCrypt hashes, HttpOnly/SameSite=Lax cookies, Secure required for production HTTPS. CSRF token is refetched after login/logout and required on mutations. Public registration always BUYER; trusted local CLI creates NEW SELLER/ADMIN accounts. No public escalation or existing-role transition.

UTC server/database instants; browser displays Asia/Seoul explicitly. Integer KRW from session inventory is authoritative; client-supplied user/price/expiry ignored. Public catalog/detail only exposes approved performances; individual seats require login. Seller ownership and admin self-approval are rechecked on server.

## Known limits
Public seller onboarding/role transitions, seat grades, aggregate active-hold quotas, cancellation/refund/resale/retry policies and paid deployment are deferred. Ownerless legacy catalog records remain readable but are excluded from management workflows. No Redis/Kafka/Kubernetes/MSA introduced. Full operational/load/HTTPS deployment validation is distinct from local functional MVP evidence.
