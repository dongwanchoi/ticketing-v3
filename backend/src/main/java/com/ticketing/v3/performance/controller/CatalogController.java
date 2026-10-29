package com.ticketing.v3.performance.controller;
import org.springframework.web.bind.annotation.*;import com.ticketing.v3.performance.service.PerformanceService;import com.ticketing.v3.seat.service.InventoryService;import com.ticketing.v3.auth.service.AuthService;import java.util.Map;
@RestController public class CatalogController {
 private final PerformanceService p;private final InventoryService inventory;private final AuthService auth;public CatalogController(PerformanceService p,InventoryService i,AuthService a){this.p=p;inventory=i;auth=a;}
 @GetMapping("/api/performances") Map<String,Object> list(@RequestParam(defaultValue="")String q){return p.catalog(q);}
 @GetMapping("/api/performances/{id}") Map<String,Object> detail(@PathVariable long id){return p.detail(id);}
 @GetMapping("/api/sessions/{id}/seats") Map<String,Object> seats(@PathVariable long id){auth.current();p.visibleSession(id);return inventory.list(id);}
}
