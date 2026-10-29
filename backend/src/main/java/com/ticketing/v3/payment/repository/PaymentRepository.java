package com.ticketing.v3.payment.repository;
import org.springframework.jdbc.core.JdbcTemplate;import org.springframework.stereotype.Repository;import com.ticketing.v3.payment.domain.Payment;import java.util.*;import static com.ticketing.v3.global.repository.Sql.insert;
@Repository public class PaymentRepository {
 private final JdbcTemplate jdbc;public PaymentRepository(JdbcTemplate j){jdbc=j;}
 public boolean exists(long hold){return !jdbc.queryForList("SELECT id FROM mock_payment WHERE hold_id=?",Long.class,hold).isEmpty();}
 public Payment create(long hold,String status,long amount,Long reservation){long id=insert(jdbc,"INSERT INTO mock_payment(hold_id,status,amount_krw,reservation_id) VALUES(?,?,?,?)",hold,status,amount,reservation);return new Payment(id,hold,status,reservation,amount);}
}
