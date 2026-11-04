package com.zkteco.attendance.modules.device;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceRepository extends JpaRepository<AttendanceDevice, Long>, JpaSpecificationExecutor<AttendanceDevice> {
    Optional<AttendanceDevice> findBySerialNumber(String serialNumber);
    boolean existsBySerialNumber(String serialNumber);
    List<AttendanceDevice> findAllByActiveTrue();
    long countByConnectionStatus(String status);
}

