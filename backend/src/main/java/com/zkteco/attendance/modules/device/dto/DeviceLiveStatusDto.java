package com.zkteco.attendance.modules.device.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceLiveStatusDto {
    private Long deviceId;
    private String deviceName;
    private String serialNumber;
    private String ipAddress;
    private Integer port;
    private boolean online;
    private String machineTime;
    private String computerTime;
    private Double driftSeconds;
    private Integer usersCount;
    private Integer attendanceCount;
    private String firmwareVersion;
    private String platform;
    private String macAddress;
    private String message;
}

