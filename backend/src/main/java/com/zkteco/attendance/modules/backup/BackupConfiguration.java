package com.zkteco.attendance.modules.backup;

import com.zkteco.attendance.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "backup_configurations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BackupConfiguration extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_code", nullable = false, unique = true, length = 50)
    @Builder.Default
    private String companyCode = "default";

    @Builder.Default
    @Column(nullable = false)
    private boolean enabled = true;

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String frequency = "DAILY"; // DAILY, WEEKLY, HOURLY, CUSTOM

    @Builder.Default
    @Column(name = "cron_expression", length = 100)
    private String cronExpression = "0 0 2 * * *";

    @Builder.Default
    @Column(name = "backup_time", length = 10)
    private String backupTime = "02:00";

    @Builder.Default
    @Column(name = "backup_day_of_week", length = 20)
    private String backupDayOfWeek = "MONDAY";

    @Builder.Default
    @Column(name = "retention_days", nullable = false)
    private int retentionDays = 30;

    @Builder.Default
    @Column(name = "include_uploads", nullable = false)
    private boolean includeUploads = false;

    @Builder.Default
    @Column(name = "gdrive_enabled", nullable = false)
    private boolean gdriveEnabled = false;

    @Column(name = "gdrive_folder_id")
    private String gdriveFolderId;

    @Builder.Default
    @Column(name = "gdrive_auth_type", length = 30)
    private String gdriveAuthType = "SERVICE_ACCOUNT"; // SERVICE_ACCOUNT or OAUTH2

    @Column(name = "gdrive_client_id")
    private String gdriveClientId;

    @Column(name = "gdrive_client_secret")
    private String gdriveClientSecret;

    @Column(name = "gdrive_refresh_token", columnDefinition = "TEXT")
    private String gdriveRefreshToken;

    @Column(name = "gdrive_user_email")
    private String gdriveUserEmail;

    @Column(name = "gdrive_service_account_json", columnDefinition = "TEXT")
    private String gdriveServiceAccountJson;

    @Column(name = "gdrive_service_account_email")
    private String gdriveServiceAccountEmail;

    @Column(name = "last_run_at")
    private Instant lastRunAt;

    @Column(name = "last_status", length = 30)
    private String lastStatus;

    @Column(name = "last_error", columnDefinition = "TEXT")
    private String lastError;
}

