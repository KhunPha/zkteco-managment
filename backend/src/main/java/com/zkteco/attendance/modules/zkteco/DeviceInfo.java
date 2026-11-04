package com.zkteco.attendance.modules.zkteco;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceInfo {
    private String serialNumber;
    private String deviceName;
    private String model;
    private String firmwareVersion;
    private String macAddress;
    private String platform;
    private Instant deviceTime;
    private int userCount;
    private int fingerprintCount;
    private int faceCount;
    private int attendanceRecordCount;
}

