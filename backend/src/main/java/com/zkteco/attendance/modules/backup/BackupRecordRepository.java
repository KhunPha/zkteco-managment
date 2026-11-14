package com.zkteco.attendance.modules.backup;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface BackupRecordRepository extends JpaRepository<BackupRecord, Long> {
    List<BackupRecord> findByCompanyCodeOrderByCreatedAtDesc(String companyCode);
    Page<BackupRecord> findByCompanyCodeOrderByCreatedAtDesc(String companyCode, Pageable pageable);
    List<BackupRecord> findByCompanyCodeAndCreatedAtBefore(String companyCode, Instant cutoff);
    boolean existsByCompanyCodeAndBackupTypeAndCreatedAtAfter(String companyCode, String backupType, Instant after);
}

