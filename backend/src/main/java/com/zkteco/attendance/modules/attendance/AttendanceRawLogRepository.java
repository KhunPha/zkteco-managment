package com.zkteco.attendance.modules.attendance;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRawLogRepository extends JpaRepository<AttendanceRawLog, Long>, JpaSpecificationExecutor<AttendanceRawLog> {
    Optional<AttendanceRawLog> findByIdempotencyKey(String idempotencyKey);
    boolean existsByIdempotencyKey(String idempotencyKey);
    List<AttendanceRawLog> findByProcessedFalseOrderByPunchTimeAsc();
    List<AttendanceRawLog> findByPunchTimeBetweenOrderByPunchTimeAsc(Instant start, Instant end);
    Page<AttendanceRawLog> findAllByOrderByPunchTimeDesc(Pageable pageable);
    Page<AttendanceRawLog> findByCompanyCodeOrderByPunchTimeDesc(String companyCode, Pageable pageable);
    List<AttendanceRawLog> findByCompanyCodeAndPunchTimeBetweenOrderByPunchTimeAsc(String companyCode, Instant start, Instant end);
    long countByCompanyCodeAndPunchTimeBetween(String companyCode, Instant start, Instant end);
    long countByPunchTimeBetween(Instant start, Instant end);
    long countByCompanyCode(String companyCode);
}

