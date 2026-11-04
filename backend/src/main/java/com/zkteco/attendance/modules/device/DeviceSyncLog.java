package com.zkteco.attendance.modules.device;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "device_sync_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeviceSyncLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private AttendanceDevice device;

    @Column(name = "sync_type", nullable = false, length = 50)
    private String syncType; // LOG_DOWNLOAD, USER_SYNC, TIME_SYNC, COMMAND

    @Column(nullable = false, length = 50)
    private String status; // SUCCESS, FAILED, PARTIAL

    @Builder.Default
    @Column(name = "records_retrieved", nullable = false)
    private int recordsRetrieved = 0;

    @Builder.Default
    @Column(name = "records_inserted", nullable = false)
    private int recordsInserted = 0;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Builder.Default
    @Column(name = "started_at", nullable = false)
    private Instant startedAt = Instant.now();

    @Column(name = "completed_at")
    private Instant completedAt;
}

