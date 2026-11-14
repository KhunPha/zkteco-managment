package com.zkteco.attendance.modules.tenant;

import com.zkteco.attendance.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "companies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Company extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_code", nullable = false, unique = true, length = 50)
    private String companyCode;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "khmer_name", length = 200)
    private String khmerName;

    @Column(name = "logo_url", columnDefinition = "TEXT")
    private String logoUrl;

    @Builder.Default
    @Column(nullable = false, length = 50)
    private String plan = "PRO"; // TRIAL, STARTER, PRO, ENTERPRISE

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String status = "ACTIVE"; // ACTIVE, SUSPENDED, EXPIRED

    @Builder.Default
    @Column(name = "max_users", nullable = false)
    private int maxUsers = 500;

    @Builder.Default
    @Column(name = "max_devices", nullable = false)
    private int maxDevices = 10;

    @Column(name = "contact_name", length = 100)
    private String contactName;

    @Column(name = "contact_phone", length = 50)
    private String contactPhone;

    @Column(name = "contact_email", length = 100)
    private String contactEmail;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "license_expires_at")
    private Instant licenseExpiresAt;
}

