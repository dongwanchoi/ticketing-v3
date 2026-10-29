package com.ticketing.v3.performance.controller;
import org.springframework.web.bind.annotation.*;import org.springframework.http.HttpStatus;import com.ticketing.v3.performance.service.PerformanceService;import com.ticketing.v3.auth.service.AuthService;import java.util.Map;
@RestController public class ManagementController {
 private final PerformanceService p;private final AuthService auth;public ManagementController(PerformanceService p,AuthService a){this.p=p;auth=a;}
 @GetMapping("/api/seller/performances") Map<String,Object> mine(){return p.listManaged(auth.require("SELLER").id());}
 @PostMapping("/api/seller/performances") @ResponseStatus(HttpStatus.CREATED) Map<String,Object> create(@RequestBody PerformanceService.CreatePerformance r){return p.create(auth.require("SELLER").id(),r);}
 @PostMapping("/api/seller/performances/{id}/sessions") @ResponseStatus(HttpStatus.CREATED) Map<String,Object> session(@PathVariable long id,@RequestBody PerformanceService.CreateSession r){return p.session(auth.require("SELLER").id(),id,r);}
 @PutMapping("/api/seller/performances/{id}/sale") PerformanceService.Sale sale(@PathVariable long id,@RequestBody PerformanceService.Sale r){return p.sale(auth.require("SELLER").id(),id,r);}
 @GetMapping("/api/admin/performances") Map<String,Object> all(){auth.require("ADMIN");return p.listManaged(null);}
 public record Review(String decision){}
 @PostMapping("/api/admin/performances/{id}/review") Map<String,Object> review(@PathVariable long id,@RequestBody Review r){return p.review(auth.require("ADMIN").id(),id,r.decision());}
}
