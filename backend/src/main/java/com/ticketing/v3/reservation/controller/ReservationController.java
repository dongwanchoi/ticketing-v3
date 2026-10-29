package com.ticketing.v3.reservation.controller;
import org.springframework.web.bind.annotation.*;import org.springframework.http.HttpStatus;import com.ticketing.v3.reservation.service.ReservationService;import com.ticketing.v3.reservation.domain.Hold;import com.ticketing.v3.auth.service.AuthService;import java.util.Map;
@RestController public class ReservationController {
 private final ReservationService reservations;private final AuthService auth;public ReservationController(ReservationService r,AuthService a){reservations=r;auth=a;}
 @PostMapping("/api/holds") @ResponseStatus(HttpStatus.CREATED) Object create(@RequestBody ReservationService.CreateHold r,@RequestHeader("Idempotency-Key")String key){return reservations.create(auth.current().id(),r,key);}
 @GetMapping("/api/holds") Map<String,Object> active(){return reservations.active(auth.current().id());}
 @GetMapping("/api/holds/{id}") Hold get(@PathVariable long id){return reservations.get(auth.current().id(),id);}
 @DeleteMapping("/api/holds/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void release(@PathVariable long id){reservations.release(auth.current().id(),id);}
 @GetMapping("/api/reservations") Map<String,Object> history(){return reservations.history(auth.current().id());}
}
