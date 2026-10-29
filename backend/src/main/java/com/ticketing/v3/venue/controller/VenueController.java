package com.ticketing.v3.venue.controller;
import org.springframework.web.bind.annotation.*;import org.springframework.http.HttpStatus;import com.ticketing.v3.auth.service.AuthService;import com.ticketing.v3.venue.service.VenueService;import java.util.Map;
@RestController @RequestMapping("/api/seller/venues") public class VenueController {
 private final VenueService venues;private final AuthService auth;public VenueController(VenueService v,AuthService a){venues=v;auth=a;}
 @GetMapping Map<String,Object> list(){return venues.list(auth.require("SELLER").id());}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) Map<String,Object> create(@RequestBody VenueService.CreateVenue r){return venues.create(auth.require("SELLER").id(),r);}
}
