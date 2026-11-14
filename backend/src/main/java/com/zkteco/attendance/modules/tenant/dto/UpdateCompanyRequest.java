package com.zkteco.attendance.modules.tenant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.Instant;

@Data
public class UpdateCompanyRequest {

    @NotBlank(message = "Company name is required")
    @Size(max = 150, message = "Company name must not exceed 150 characters")
    private String name;

    private String khmerName;
    private String logoUrl;
    private String plan;
    private String status;
    private Integer maxUsers;
    private Integer maxDevices;
    private String contactName;
    private String contactPhone;
    private String contactEmail;
    private String address;
    private Instant licenseExpiresAt;
}

