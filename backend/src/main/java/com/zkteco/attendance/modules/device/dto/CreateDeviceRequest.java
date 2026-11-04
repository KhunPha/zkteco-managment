package com.zkteco.attendance.modules.device.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateDeviceRequest {
    @NotBlank(message = "Device name is required")
    private String name;

    @NotBlank(message = "Serial number is required")
    private String serialNumber;

    private String model;
    private String ipAddress;
    private Integer port;
    private String commKey;
    private String integrationType; // TCP_PULL, ADMS_PUSH, SDK_STANDALONE
    private String location;
    private Long branchId;
    private Long departmentId;
    private String description;
    private Boolean active;
}

