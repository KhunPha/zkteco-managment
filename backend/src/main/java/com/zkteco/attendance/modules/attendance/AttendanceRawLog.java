package com.zkteco.attendance.modules.attendance;

import com.zkteco.attendance.modules.device.AttendanceDevice;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "attendance_raw_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceRawLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id")
    private AttendanceDevice device;

    @Column(name = "device_sn", nullable = false, length = 100)
    private String deviceSn;

    @Column(name = "device_pin", nullable = false, length = 50)
    private String devicePin;

    @Column(name = "punch_time", nullable = false)
    private Instant punchTime;

    @Builder.Default
    @Column(name = "verify_type", nullable = false, length = 50)
    private String verifyType = "OTHER"; // FINGERPRINT, FACE, CARD, PASSWORD, OTHER

    @Builder.Default
    @Column(name = "punch_state", nullable = false, length = 50)
    private String punchState = "CHECK_IN"; // CHECK_IN, CHECK_OUT, BREAK_OUT, BREAK_IN, OVERTIME_IN, OVERTIME_OUT, UNKNOWN

    @Column(name = "work_code", length = 50)
    private String workCode;

    @Column(name = "original_payload", columnDefinition = "TEXT")
    private String originalPayload;

    @Builder.Default
    @Column(nullable = false)
    private boolean processed = false;

    @Column(name = "processed_at")
    private Instant processedAt;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 128)
    private String idempotencyKey;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

