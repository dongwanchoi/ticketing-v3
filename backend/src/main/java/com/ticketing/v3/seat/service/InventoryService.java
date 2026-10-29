package com.ticketing.v3.seat.service;
import org.springframework.stereotype.Service;import org.springframework.transaction.annotation.Transactional;import com.ticketing.v3.seat.repository.InventoryRepository;import com.ticketing.v3.global.exception.ApiException;import java.time.*;import java.util.*;
@Service public class InventoryService {
 private final InventoryRepository inventory;private final Clock clock;public InventoryService(InventoryRepository i,Clock c){inventory=i;clock=c;}
 @Transactional public void initialize(long session,List<Long> seats,long price){inventory.initialize(session,seats,price);}
 @Transactional public long claim(long session,List<Long> seats,long hold,Instant now){long total=0;for(long seat:seats.stream().sorted().toList()){if(inventory.claim(session,seat,hold,now)!=1)throw ApiException.conflict("SEAT_UNAVAILABLE");total=Math.addExact(total,inventory.price(session,seat));}return total;}
 @Transactional public void confirm(long hold,long session,List<Long> seats){for(long seat:seats.stream().sorted().toList())if(inventory.confirm(hold,session,seat)!=1)throw ApiException.conflict("HOLD_LOST");}
 @Transactional public void release(long hold){inventory.release(hold);}
 public Map<String,Object> list(long session){return Map.of("items",inventory.list(session,clock.instant()));}
}
