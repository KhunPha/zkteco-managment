package com.zkteco.attendance.modules.attendance;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "attendance_processing_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceProcessingLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "process_date", nullable = false)
    private LocalDate processDate;

    @Builder.Default
    @Column(name = "total_raw_logs", nullable = false)
    private int totalRawLogs = 0;

    @Builder.Default
    @Column(name = "total_processed", nullable = false)
    private int totalProcessed = 0;

    @Builder.Default
    @Column(name = "total_errors", nullable = false)
    private int totalErrors = 0;

    @Column(name = "error_details", columnDefinition = "TEXT")
    private String errorDetails;

    @Builder.Default
    @Column(name = "executed_at", nullable = false)
    private Instant executedAt = Instant.now();
}

