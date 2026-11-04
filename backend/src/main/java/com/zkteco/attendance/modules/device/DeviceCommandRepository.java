package com.zkteco.attendance.modules.device;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeviceCommandRepository extends JpaRepository<DeviceCommand, Long> {
    List<DeviceCommand> findByDeviceIdAndStatusOrderByCreatedAtAsc(Long deviceId, String status);
    List<DeviceCommand> findByDeviceSerialNumberAndStatusOrderByCreatedAtAsc(String serialNumber, String status);
}

