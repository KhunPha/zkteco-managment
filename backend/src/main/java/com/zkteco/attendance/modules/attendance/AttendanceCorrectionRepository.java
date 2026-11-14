package com.zkteco.attendance.modules.attendance;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttendanceCorrectionRepository extends JpaRepository<AttendanceCorrection, Long> {
    Page<AttendanceCorrection> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    Page<AttendanceCorrection> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<AttendanceCorrection> findByEmployeeCompanyCodeAndStatusOrderByCreatedAtDesc(String companyCode, String status, Pageable pageable);
    Page<AttendanceCorrection> findByEmployeeCompanyCodeOrderByCreatedAtDesc(String companyCode, Pageable pageable);
    List<AttendanceCorrection> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);
}

