package com.ticketing.v3.payment.controller;
import org.springframework.web.bind.annotation.*;import com.ticketing.v3.payment.service.PaymentService;import com.ticketing.v3.auth.service.AuthService;
@RestController public class PaymentController {
 public record Pay(String outcome){}
 private final PaymentService payments;private final AuthService auth;public PaymentController(PaymentService p,AuthService a){payments=p;auth=a;}
 @PostMapping("/api/holds/{id}/payments") Object pay(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Pay r){return payments.pay(auth.current().id(),id,r.outcome(),key);}
}
