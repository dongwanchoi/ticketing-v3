package com.ticketing.v3.reservation.domain;
import java.time.Instant;import java.util.List;
public record Hold(long id,long sessionId,List<Long> seatIds,Instant expiresAt,String status,long totalKrw,String paymentStatus) {}
