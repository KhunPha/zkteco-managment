package com.zkteco.attendance.modules.backup;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "backup_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BackupRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_code", nullable = false, length = 50)
    @Builder.Default
    private String companyCode = "default";

    @Column(nullable = false)
    private String filename;

    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;

    @Builder.Default
    @Column(name = "file_size_bytes", nullable = false)
    private Long fileSizeBytes = 0L;

    @Builder.Default
    @Column(name = "backup_type", nullable = false, length = 30)
    private String backupType = "MANUAL"; // MANUAL, SCHEDULED

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String status = "IN_PROGRESS"; // IN_PROGRESS, SUCCESS, FAILED

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "gdrive_file_id")
    private String gdriveFileId;

    @Column(name = "gdrive_web_view_link", columnDefinition = "TEXT")
    private String gdriveWebViewLink;

    @Builder.Default
    @Column(name = "gdrive_status", nullable = false, length = 30)
    private String gdriveStatus = "NOT_CONFIGURED"; // NOT_CONFIGURED, PENDING, UPLOADED, FAILED

    @Column(name = "gdrive_error", columnDefinition = "TEXT")
    private String gdriveError;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "completed_at")
    private Instant completedAt;
}

