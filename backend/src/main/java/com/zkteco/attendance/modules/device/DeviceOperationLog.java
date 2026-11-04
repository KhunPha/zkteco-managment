package com.zkteco.attendance.modules.device;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "device_operation_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeviceOperationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private AttendanceDevice device;

    @Column(nullable = false, length = 50)
    private String operation; // CONNECT, DISCONNECT, RESTART, CLEAR_LOGS, SYNC_TIME, ENROLL_USER, INFO

    @Column(name = "initiated_by", length = 100)
    private String initiatedBy;

    @Column(columnDefinition = "TEXT")
    private String parameters;

    @Column(nullable = false, length = 50)
    private String result; // SUCCESS, FAILED

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

