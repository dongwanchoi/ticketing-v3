# Data ownership and proposed ERD
User(auth) → Performance(performance, seller owner) → PerformanceSession(performance).
Venue(venue) → Seat(venue); PerformanceSession → SessionSeat(seat) ← Seat.
Performance → PerformanceSale(performance, UNIQUE performance_id).
Reservation(reservation) → Payment(payment); hold schema pending policy approval.
SessionSeat UNIQUE(session_id, seat_id); prices nonnegative integer KRW, FK constraints and indexes on all lookup foreign keys. Sale times both null or end > start. Approval and seller ownership enforced server-side. First migration implements only approved catalog slice. No production/V1/V2 database is used.
