package com.ticketing.v3.reservation.repository;
import org.springframework.jdbc.core.JdbcTemplate;import org.springframework.stereotype.Repository;import com.ticketing.v3.reservation.domain.Hold;import java.time.*;import java.util.*;import static com.ticketing.v3.global.repository.Sql.*;
@Repository public class ReservationRepository {
 private final JdbcTemplate jdbc;public ReservationRepository(JdbcTemplate j){jdbc=j;}
 public long create(long user,long session,Instant expiry){return insert(jdbc,"INSERT INTO seat_hold(user_id,session_id,expires_at,status,total_krw) VALUES(?,?,?,'ACTIVE',0)",user,session,stamp(expiry));}
 public void attach(long id,List<Long> seats,long total){for(long seat:seats)jdbc.update("INSERT INTO hold_seat(hold_id,seat_id) VALUES(?,?)",id,seat);jdbc.update("UPDATE seat_hold SET total_krw=? WHERE id=?",total,id);}
 public record OwnedHold(Hold hold,long user){}
 public Optional<OwnedHold> find(long id,boolean lock){return jdbc.query("SELECT * FROM seat_hold WHERE id=?"+(lock?" FOR UPDATE":""),(r,n)->new OwnedHold(new Hold(r.getLong("id"),r.getLong("session_id"),seats(id),r.getTimestamp("expires_at").toInstant(),r.getString("status"),r.getLong("total_krw")),r.getLong("user_id")),id).stream().findFirst();}
 public List<Long> seats(long id){return jdbc.queryForList("SELECT seat_id FROM hold_seat WHERE hold_id=? ORDER BY seat_id",Long.class,id);}
 public void status(long id,String status){jdbc.update("UPDATE seat_hold SET status=? WHERE id=?",status,id);}
 public long reservation(long hold,long user,Instant now){return insert(jdbc,"INSERT INTO reservation(hold_id,user_id,created_at) VALUES(?,?,?)",hold,user,stamp(now));}
 public List<Map<String,Object>> history(long user){return jdbc.queryForList("SELECT r.id,p.title AS performanceTitle,h.session_id AS sessionId,ps.starts_at AS startsAt,h.total_krw AS totalKrw,r.hold_id AS holdId FROM reservation r JOIN seat_hold h ON h.id=r.hold_id JOIN performance_session ps ON ps.id=h.session_id JOIN performance p ON p.id=ps.performance_id WHERE r.user_id=? ORDER BY r.id DESC",user);}
 public List<String> labels(long hold){return jdbc.queryForList("SELECT s.label FROM hold_seat hs JOIN seat s ON s.id=hs.seat_id WHERE hs.hold_id=? ORDER BY s.id",String.class,hold);}
}
