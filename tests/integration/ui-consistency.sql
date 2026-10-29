-- Read-only final-state checks after real browser flows; choose the isolated UI database explicitly.
-- Every anomaly count below must be 0. No credentials or personal data are returned.
SELECT 'booked_without_confirmed_hold' AS check_name, COUNT(*) AS anomalies
FROM session_seat s JOIN seat_hold h ON h.id=s.hold_id
WHERE s.status='BOOKED' AND h.status<>'CONFIRMED';
SELECT 'reservation_without_success_payment' AS check_name, COUNT(*) AS anomalies
FROM reservation r LEFT JOIN mock_payment p ON p.reservation_id=r.id AND p.status='SUCCESS'
WHERE p.id IS NULL;
SELECT 'confirmed_without_reservation' AS check_name, COUNT(*) AS anomalies
FROM seat_hold h LEFT JOIN reservation r ON r.hold_id=h.id
WHERE h.status='CONFIRMED' AND r.id IS NULL;
SELECT 'reservation_owner_or_amount_mismatch' AS check_name, COUNT(*) AS anomalies
FROM reservation r JOIN seat_hold h ON r.hold_id=h.id JOIN mock_payment p ON p.reservation_id=r.id
WHERE r.user_id<>h.user_id OR p.amount_krw<>h.total_krw OR p.hold_id<>h.id;
SELECT 'duplicate_reserved_session_seat' AS check_name, COUNT(*) AS anomalies FROM (
 SELECT h.session_id,hs.seat_id FROM reservation r JOIN seat_hold h ON h.id=r.hold_id
 JOIN hold_seat hs ON hs.hold_id=h.id GROUP BY h.session_id,hs.seat_id HAVING COUNT(*)>1
) collisions;
SELECT 'reservation_inventory_or_total_mismatch' AS check_name, COUNT(*) AS anomalies FROM (
 SELECT h.id FROM reservation r JOIN seat_hold h ON h.id=r.hold_id
 JOIN hold_seat hs ON hs.hold_id=h.id
 LEFT JOIN session_seat s ON s.session_id=h.session_id AND s.seat_id=hs.seat_id
 GROUP BY h.id,h.total_krw
 HAVING SUM(s.seat_id IS NULL OR s.status<>'BOOKED' OR s.hold_id IS NULL OR s.hold_id<>h.id)>0
 OR COUNT(*)<1 OR COUNT(*)>4 OR SUM(s.price_krw)<>h.total_krw
) mismatches;
SELECT 'reservation_count' AS check_name,COUNT(*) AS observed FROM reservation;
