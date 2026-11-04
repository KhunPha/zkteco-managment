package com.zkteco.attendance.modules.device;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeviceSyncLogRepository extends JpaRepository<DeviceSyncLog, Long> {
    Page<DeviceSyncLog> findByDeviceIdOrderByStartedAtDesc(Long deviceId, Pageable pageable);
    List<DeviceSyncLog> findTop10ByOrderByStartedAtDesc();
}

