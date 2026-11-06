package com.zkteco.attendance.modules.biometric;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FaceScanLogRepository extends JpaRepository<FaceScanLog, Long> {

    List<FaceScanLog> findTop20ByOrderByCreatedAtDesc();

    Page<FaceScanLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}

