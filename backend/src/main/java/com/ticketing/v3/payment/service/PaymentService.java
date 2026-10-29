package com.ticketing.v3.payment.service;
import org.springframework.stereotype.Service;import org.springframework.transaction.annotation.Transactional;import com.ticketing.v3.payment.repository.PaymentRepository;import com.ticketing.v3.reservation.service.ReservationService;import com.ticketing.v3.global.service.IdempotencyService;import com.ticketing.v3.global.exception.ApiException;
@Service public class PaymentService {
 private final PaymentRepository payments;private final ReservationService reservations;private final IdempotencyService idem;
 public PaymentService(PaymentRepository p,ReservationService r,IdempotencyService i){payments=p;reservations=r;idem=i;}
 @Transactional public Object pay(long user,long hold,String outcome,String key){if(!"SUCCESS".equals(outcome)&&!"FAILURE".equals(outcome))throw ApiException.bad("Simulation outcome required");return idem.execute(user,"payment",key,hold+":"+outcome,()->{var h=reservations.payable(user,hold);if(payments.exists(hold))throw ApiException.conflict("POLICY_NOT_ENABLED");Long reservation=outcome.equals("SUCCESS")?reservations.confirm(user,h):null;return payments.create(hold,outcome.equals("SUCCESS")?"SUCCESS":"FAILED",h.totalKrw(),reservation);});}
}
