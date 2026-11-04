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
public class DeviceDto {
    private Long id;
    private String name;
    private String serialNumber;
    private String model;
    private String ipAddress;
    private int port;
    private String commKey;
    private String integrationType;
    private String location;
    private Long branchId;
    private String branchName;
    private Long departmentId;
    private String departmentName;
    private String description;
    private String connectionStatus;
    private Instant lastCommunication;
    private Instant lastSync;
    private String firmwareVersion;
    private boolean active;
}

