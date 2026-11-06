package com.zkteco.attendance.modules.device;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceUserRepository extends JpaRepository<AttendanceDeviceUser, Long>, JpaSpecificationExecutor<AttendanceDeviceUser> {
    Optional<AttendanceDeviceUser> findByDeviceIdAndDevicePin(Long deviceId, String devicePin);
    List<AttendanceDeviceUser> findByDeviceId(Long deviceId);
    long countByDeviceId(Long deviceId);
    List<AttendanceDeviceUser> findByEmployeeId(Long employeeId);
    List<AttendanceDeviceUser> findByStudentId(Long studentId);
    Optional<AttendanceDeviceUser> findByDeviceSerialNumberAndDevicePin(String serialNumber, String devicePin);
    List<AttendanceDeviceUser> findByDevicePin(String devicePin);
    boolean existsByDeviceIdAndDevicePin(Long deviceId, String devicePin);
}

