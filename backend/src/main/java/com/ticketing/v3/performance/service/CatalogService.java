package com.ticketing.v3.performance.service;
import com.ticketing.v3.performance.repository.PerformanceRepository;
import com.ticketing.v3.performance.dto.CatalogResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class CatalogService {
 private final PerformanceRepository repository;
 public CatalogService(PerformanceRepository repository) { this.repository=repository; }
 @Transactional(readOnly=true)
 public CatalogResponse list() {
  return new CatalogResponse(repository.findByApprovalStatusOrderByIdAsc("APPROVED").stream()
   .map(p -> new CatalogResponse.Item(p.getId(),p.getTitle(),p.getVenueName(),p.getMinPriceKrw(),p.getMaxPriceKrw())).toList());
 }
}
