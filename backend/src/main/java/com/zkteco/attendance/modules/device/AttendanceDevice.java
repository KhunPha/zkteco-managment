package com.zkteco.attendance.modules.device;

import com.zkteco.attendance.common.BaseEntity;
import com.zkteco.attendance.modules.organization.Branch;
import com.zkteco.attendance.modules.organization.Department;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "attendance_devices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceDevice extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "serial_number", nullable = false, unique = true, length = 100)
    private String serialNumber;

    @Column(length = 100)
    private String model;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Builder.Default
    @Column(nullable = false)
    private int port = 4370;

    @Builder.Default
    @Column(name = "comm_key", length = 100)
    private String commKey = "0";

    @Builder.Default
    @Column(name = "integration_type", nullable = false, length = 50)
    private String integrationType = "ADMS_PUSH"; // TCP_PULL, ADMS_PUSH, SDK_STANDALONE

    @Column(length = 255)
    private String location;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    @Column(name = "connection_status", nullable = false, length = 50)
    private String connectionStatus = "OFFLINE"; // ONLINE, OFFLINE, ERROR, UNKNOWN

    @Column(name = "last_communication")
    private Instant lastCommunication;

    @Column(name = "last_sync")
    private Instant lastSync;

    @Column(name = "firmware_version", length = 100)
    private String firmwareVersion;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}

