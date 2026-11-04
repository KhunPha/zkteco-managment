package com.zkteco.attendance.modules.attendance;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface AttendanceProcessingLogRepository extends JpaRepository<AttendanceProcessingLog, Long> {
    Optional<AttendanceProcessingLog> findFirstByProcessDateOrderByExecutedAtDesc(LocalDate processDate);
    Page<AttendanceProcessingLog> findAllByOrderByExecutedAtDesc(Pageable pageable);
}

