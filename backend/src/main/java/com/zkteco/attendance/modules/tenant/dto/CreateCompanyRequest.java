package com.zkteco.attendance.modules.tenant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.Instant;

@Data
public class CreateCompanyRequest {

    @NotBlank(message = "Company code is required")
    @Size(min = 2, max = 50, message = "Company code must be between 2 and 50 characters")
    @Pattern(regexp = "^[a-zA-Z0-9_-]+$", message = "Company code must contain only letters, numbers, underscores, and dashes")
    private String companyCode;

    @NotBlank(message = "Company name is required")
    @Size(max = 150, message = "Company name must not exceed 150 characters")
    private String name;

    private String khmerName;
    private String logoUrl;
    private String plan = "PRO"; // TRIAL, STARTER, PRO, ENTERPRISE
    private String status = "ACTIVE"; // ACTIVE, SUSPENDED, EXPIRED
    private int maxUsers = 500;
    private int maxDevices = 10;
    private String contactName;
    private String contactPhone;
    private String contactEmail;
    private String address;
    private Instant licenseExpiresAt;

    // Initial Company Administrator Account (Super Admin / Admin for this company)
    private String adminUsername;
    private String adminEmail;
    private String adminPassword;
    private String adminFullName;
}

