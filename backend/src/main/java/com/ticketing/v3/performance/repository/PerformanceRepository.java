package com.ticketing.v3.performance.repository;
import com.ticketing.v3.performance.domain.Performance;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface PerformanceRepository extends JpaRepository<Performance,Long> {
 List<Performance> findByApprovalStatusOrderByIdAsc(String approvalStatus);
}
