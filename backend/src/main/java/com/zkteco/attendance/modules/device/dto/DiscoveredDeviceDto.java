package com.zkteco.attendance.modules.device.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiscoveredDeviceDto {
    private String ipAddress;
    private int port;
    private String serialNumber;
    private String model;
    private String firmwareVersion;
    private long responseTimeMs;
    private boolean alreadyRegistered;
    private Long existingDeviceId;
    private String existingDeviceName;
}

