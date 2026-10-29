package com.ticketing.v3.seat.repository;
import org.springframework.jdbc.core.JdbcTemplate;import org.springframework.stereotype.Repository;import java.util.*;import java.time.*;import static com.ticketing.v3.global.repository.Sql.stamp;
@Repository public class InventoryRepository {
 private final JdbcTemplate jdbc;public InventoryRepository(JdbcTemplate j){jdbc=j;}
 public void initialize(long session,List<Long> seats,long price){for(long seat:seats)jdbc.update("INSERT INTO session_seat(session_id,seat_id,price_krw) VALUES(?,?,?)",session,seat,price);}
 public int claim(long session,long seat,long hold,Instant now){return jdbc.update("UPDATE session_seat ss LEFT JOIN seat_hold old ON old.id=ss.hold_id SET ss.status='HELD',ss.hold_id=? WHERE ss.session_id=? AND ss.seat_id=? AND (ss.status='AVAILABLE' OR(ss.status='HELD' AND old.expires_at<=?))",hold,session,seat,stamp(now));}
 public long price(long session,long seat){return jdbc.queryForObject("SELECT price_krw FROM session_seat WHERE session_id=? AND seat_id=?",Long.class,session,seat);}
 public int confirm(long hold,long session,long seat){return jdbc.update("UPDATE session_seat SET status='BOOKED' WHERE session_id=? AND seat_id=? AND hold_id=? AND status='HELD'",session,seat,hold);}
 public void release(long hold){jdbc.update("UPDATE session_seat SET status='AVAILABLE',hold_id=NULL WHERE hold_id=? AND status='HELD'",hold);}
 public List<Map<String,Object>> list(long session,Instant now){return jdbc.queryForList("SELECT ss.seat_id AS seatId,s.label,ss.price_krw AS priceKrw,CASE WHEN ss.status='HELD' AND h.expires_at<=? THEN 'AVAILABLE' ELSE ss.status END AS status FROM session_seat ss JOIN seat s ON s.id=ss.seat_id LEFT JOIN seat_hold h ON h.id=ss.hold_id WHERE ss.session_id=? ORDER BY s.id",stamp(now),session);}
}
