package com.ticketing.v3.venue.service;
import org.springframework.stereotype.Service;import org.springframework.transaction.annotation.Transactional;import com.ticketing.v3.venue.repository.VenueRepository;import com.ticketing.v3.global.exception.ApiException;import java.util.*;
@Service public class VenueService {
 private final VenueRepository venues;public VenueService(VenueRepository v){venues=v;}
 public record CreateVenue(String name,int rows,int seatsPerRow){}
 @Transactional public Map<String,Object> create(long owner,CreateVenue request){if(request.name()==null||request.name().isBlank()||request.name().length()>255||request.rows()<1||request.rows()>26||request.seatsPerRow()<1||request.seatsPerRow()>50)throw ApiException.bad("Invalid venue or seat layout");long id=venues.create(owner,request.name().trim(),request.rows(),request.seatsPerRow());return view(id);}
 public Map<String,Object> owned(long owner,long id){var v=venues.find(id).orElseThrow(ApiException::missing);if(((Number)v.get("ownerId")).longValue()!=owner)throw ApiException.forbidden();return v;}
 public List<Long> seatIds(long id){return venues.seats(id).stream().map(s->((Number)s.get("id")).longValue()).toList();}
 public Map<String,Object> view(long id){var v=venues.find(id).orElseThrow(ApiException::missing);return Map.of("id",id,"name",v.get("name"),"seats",venues.seats(id));}
 public Map<String,Object> list(long owner){return Map.of("items",venues.list(owner).stream().map(v->view(((Number)v.get("id")).longValue())).toList());}
}
