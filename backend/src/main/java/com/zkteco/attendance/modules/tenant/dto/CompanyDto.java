package com.zkteco.attendance.modules.tenant.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyDto {
    private Long id;
    private String companyCode;
    private String name;
    private String khmerName;
    private String logoUrl;
    private String plan;
    private String status;
    private int maxUsers;
    private int maxDevices;
    private String contactName;
    private String contactPhone;
    private String contactEmail;
    private String address;
    private Instant licenseExpiresAt;
    private Instant createdAt;
    private long employeeCount;
    private long deviceCount;
    private String adminUsername;
    private String adminEmail;
    private String initialAdminPassword;
}

