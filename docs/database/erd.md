# Data ownership and proposed ERD
User(auth) → Performance(performance, seller owner) → PerformanceSession(performance).
Venue(venue) → Seat(venue); PerformanceSession → SessionSeat(seat) ← Seat.
Performance → PerformanceSale(performance, UNIQUE performance_id).
Reservation(reservation) → Payment(payment); hold schema pending policy approval.
SessionSeat UNIQUE(session_id, seat_id); prices nonnegative integer KRW, FK constraints and indexes on all lookup foreign keys. Sale times both null or end > start. Approval and seller ownership enforced server-side. First migration implements only approved catalog slice. No production/V1/V2 database is used.

## First-slice implementation boundary
The initial catalog migration stores title, venue label, approval status and min/max display price directly on performance as a transitional read-only catalog. It does not yet implement Venue/Seat/SessionSeat, per-session availability, seller ownership, or sale policy. These display prices are not payment authority. Before booking, derive pricing from SessionSeat and evolve via additive Flyway migrations after integrity review. Do not describe this small schema as the completed ERD.
