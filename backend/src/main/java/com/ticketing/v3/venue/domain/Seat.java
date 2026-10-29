package com.ticketing.v3.venue.domain;
import jakarta.persistence.*;
@Entity @Table(name="seat") public class Seat {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(name="venue_id",nullable=false) private long venueId;
 @Column(nullable=false,length=30) private String label;
 @Column(name="row_label",nullable=false,length=2) private String rowLabel;
 @Column(name="seat_number",nullable=false) private int seatNumber;
 protected Seat(){} public Seat(long venue,String row,int number){venueId=venue;rowLabel=row;seatNumber=number;label=row+"-"+number;}
 public long id(){return id;}public String label(){return label;}public String rowLabel(){return rowLabel;}public int seatNumber(){return seatNumber;}
}
