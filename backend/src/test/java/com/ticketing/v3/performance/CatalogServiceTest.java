package com.ticketing.v3.performance;
import com.ticketing.v3.performance.repository.PerformanceRepository;
import com.ticketing.v3.performance.service.CatalogService;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.List;
class CatalogServiceTest {
 @Test void emptyCatalogOnlyQueriesApprovedRows() {
  var repository=mock(PerformanceRepository.class);
  when(repository.findByApprovalStatusOrderByIdAsc("APPROVED")).thenReturn(List.of());
  assertTrue(new CatalogService(repository).list().items().isEmpty());
  verify(repository).findByApprovalStatusOrderByIdAsc("APPROVED");
 }
}
