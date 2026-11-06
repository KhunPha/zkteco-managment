package com.zkteco.attendance.modules.device.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceControlResponseDto {
    private Long deviceId;
    private String deviceName;
    private String serialNumber;
    private String ipAddress;
    private boolean success;
    private String action;
    private String message;
    private Double driftSeconds;
    private String machineTime;
    private String computerTime;
}

