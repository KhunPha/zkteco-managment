package com.zkteco.attendance.modules.device.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceUserDto {
    private Long id;
    private Long deviceId;
    private String deviceName;
    private String deviceSerialNumber;
    private String devicePin;
    private Long employeeId;
    private String employeeCode;
    private String employeeName;
    private Long studentId;
    private String studentCode;
    private String studentName;
    private String studentGrade;
    private String studentClassName;
    private String departmentName;
    private String positionTitle;
    private String personnelType; // STUDENT, TEACHER, STAFF, USER
    private String nameOnDevice;
    private String privilege;
    private String cardNumber;
    private int cardHistoryCount;
    private boolean faceEnrolled;
    private int fingerprintCount;
    private String syncStatus;
    private String status; // ACTIVE, INACTIVE
    private String profileImageUrl;
    private String personnelKhmerName;
    private String companyCode;
    private Instant lastSyncedAt;

    private java.util.List<Long> deviceIds;
    private java.util.List<String> deviceNames;
    private java.util.List<String> deviceSerialNumbers;
    private java.util.List<Long> allDeviceUserIds;
    private int deviceCount;
    private java.util.List<DeviceInfo> syncedDevices;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeviceInfo {
        private Long deviceId;
        private String deviceName;
        private String deviceSerialNumber;
        private String ipAddress;
        private int port;
        private String integrationType;
        private Long deviceUserId;
        private String syncStatus;
    }
}

