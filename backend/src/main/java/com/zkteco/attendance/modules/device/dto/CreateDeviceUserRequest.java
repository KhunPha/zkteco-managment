package com.zkteco.attendance.modules.device.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateDeviceUserRequest {
    @NotNull(message = "Device ID is required")
    private Long deviceId;

    @NotBlank(message = "Device PIN is required")
    private String devicePin;

    private Long employeeId;
    private Long studentId;
    private String nameOnDevice;
    private String privilege; // NORMAL_USER, ADMIN, ENROLLER, SUPER_ADMIN
    private String cardNumber;
    private String password;
    private Boolean faceEnrolled;
    private Integer fingerprintCount;
}


