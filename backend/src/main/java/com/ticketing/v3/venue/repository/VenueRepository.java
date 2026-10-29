package com.ticketing.v3.venue.repository;
import org.springframework.stereotype.Repository;import jakarta.persistence.*;import com.ticketing.v3.venue.domain.*;import java.util.*;
@Repository public class VenueRepository {
 @PersistenceContext private EntityManager entities;
 public long create(long owner,String name,int rows,int perRow){var venue=new Venue(owner,name);entities.persist(venue);for(int row=0;row<rows;row++)for(int n=1;n<=perRow;n++)entities.persist(new Seat(venue.id(),String.valueOf((char)('A'+row)),n));entities.flush();return venue.id();}
 public List<Map<String,Object>> list(long owner){return entities.createQuery("select v from Venue v where v.ownerId=:owner order by v.id",Venue.class).setParameter("owner",owner).getResultList().stream().map(v->Map.<String,Object>of("id",v.id(),"name",v.name())).toList();}
 public List<Map<String,Object>> seats(long venue){return entities.createQuery("select s from Seat s where s.venueId=:venue order by s.id",Seat.class).setParameter("venue",venue).getResultList().stream().map(s->Map.<String,Object>of("id",s.id(),"label",s.label(),"rowLabel",s.rowLabel(),"seatNumber",s.seatNumber())).toList();}
 public Optional<Map<String,Object>> find(long id){return Optional.ofNullable(entities.find(Venue.class,id)).map(v->Map.of("id",v.id(),"ownerId",v.ownerId(),"name",v.name()));}
}
