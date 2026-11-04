package com.zkteco.attendance.modules.shift;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeScheduleRepository extends JpaRepository<EmployeeSchedule, Long> {
    List<EmployeeSchedule> findByEmployeeId(Long employeeId);

    @Query("SELECT s FROM EmployeeSchedule s WHERE s.employee.id = :empId AND s.effectiveFrom <= :date AND (s.effectiveTo IS NULL OR s.effectiveTo >= :date) ORDER BY s.effectiveFrom DESC")
    List<EmployeeSchedule> findActiveSchedules(@Param("empId") Long empId, @Param("date") LocalDate date);

    @Query("SELECT s FROM EmployeeSchedule s WHERE s.effectiveFrom <= :date AND (s.effectiveTo IS NULL OR s.effectiveTo >= :date)")
    List<EmployeeSchedule> findAllActiveSchedules(@Param("date") LocalDate date);
}

