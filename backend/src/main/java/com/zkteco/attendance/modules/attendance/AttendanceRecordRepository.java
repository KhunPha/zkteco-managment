package com.zkteco.attendance.modules.attendance;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long>, JpaSpecificationExecutor<AttendanceRecord> {
    Optional<AttendanceRecord> findByEmployeeIdAndAttendanceDate(Long employeeId, LocalDate attendanceDate);
    Optional<AttendanceRecord> findByStudentIdAndAttendanceDate(Long studentId, LocalDate attendanceDate);
    List<AttendanceRecord> findByAttendanceDate(LocalDate attendanceDate);
    List<AttendanceRecord> findByEmployeeIdAndAttendanceDateBetween(Long employeeId, LocalDate start, LocalDate end);
    long countByAttendanceDateAndStatus(LocalDate date, String status);

    @Query("SELECT COUNT(a) FROM AttendanceRecord a WHERE a.attendanceDate = :date AND a.status IN ('PRESENT', 'LATE', 'EARLY_DEPARTURE')")
    long countPresentToday(@Param("date") LocalDate date);
}

