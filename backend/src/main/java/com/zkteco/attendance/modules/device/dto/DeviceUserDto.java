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
    private String nameOnDevice;
    private String privilege;
    private String cardNumber;
    private boolean faceEnrolled;
    private int fingerprintCount;
    private String syncStatus;
    private Instant lastSyncedAt;
}

