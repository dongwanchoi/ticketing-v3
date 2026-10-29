package com.ticketing.v3.performance.domain;
import jakarta.persistence.*;
@Entity
@Table(name="performance")
public class Performance {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 private String title;
 @Column(name="venue_name") private String venueName;
 @Column(name="min_price_krw") private int minPriceKrw;
 @Column(name="max_price_krw") private int maxPriceKrw;
 @Column(name="approval_status") private String approvalStatus;
 protected Performance() {}
 public Long getId() { return id; }
 public String getTitle() { return title; }
 public String getVenueName() { return venueName; }
 public int getMinPriceKrw() { return minPriceKrw; }
 public int getMaxPriceKrw() { return maxPriceKrw; }
}
