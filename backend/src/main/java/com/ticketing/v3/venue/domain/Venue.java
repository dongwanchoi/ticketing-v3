package com.ticketing.v3.venue.domain;
import jakarta.persistence.*;
@Entity @Table(name="venue") public class Venue {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(name="owner_id",nullable=false) private long ownerId;
 @Column(nullable=false) private String name;
 protected Venue(){} public Venue(long owner,String name){ownerId=owner;this.name=name;}
 public long id(){return id;}public long ownerId(){return ownerId;}public String name(){return name;}
}
