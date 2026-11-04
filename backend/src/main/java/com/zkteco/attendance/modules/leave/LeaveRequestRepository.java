package com.zkteco.attendance.modules.leave;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    Page<LeaveRequest> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    List<LeaveRequest> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);

    @Query("SELECT r FROM LeaveRequest r WHERE r.employee.id = :empId AND r.status = 'APPROVED' AND r.startDate <= :date AND r.endDate >= :date")
    List<LeaveRequest> findApprovedLeavesOnDate(@Param("empId") Long empId, @Param("date") LocalDate date);

    @Query("SELECT COUNT(r) FROM LeaveRequest r WHERE r.status = 'APPROVED' AND r.startDate <= :date AND r.endDate >= :date")
    long countEmployeesOnLeaveToday(@Param("date") LocalDate date);
}

