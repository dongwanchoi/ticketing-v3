package com.ticketing.v3.performance.dto;
import java.util.List;
public record CatalogResponse(List<Item> items) {
 public record Item(long id, String title, String venueName, int minPriceKrw, int maxPriceKrw) {}
}
