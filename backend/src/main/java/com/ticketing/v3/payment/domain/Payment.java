package com.ticketing.v3.payment.domain;
public record Payment(long id,long holdId,String status,Long reservationId,long amountKrw) {}
