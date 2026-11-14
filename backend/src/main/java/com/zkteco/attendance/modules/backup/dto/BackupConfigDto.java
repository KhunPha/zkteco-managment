package com.zkteco.attendance.modules.backup.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BackupConfigDto {
    private Long id;
    private String companyCode;
    private boolean enabled;
    private String frequency;
    private String cronExpression;
    private String backupTime;
    private String backupDayOfWeek;
    private int retentionDays;
    private boolean includeUploads;
    private boolean gdriveEnabled;
    private String gdriveFolderId;
    private String gdriveAuthType; // SERVICE_ACCOUNT or OAUTH2
    private String gdriveClientId;
    private String gdriveUserEmail;
    private boolean hasOAuthRefreshToken;
    private String gdriveServiceAccountEmail;
    private boolean hasServiceAccountJson;
    private Instant lastRunAt;
    private String lastStatus;
    private String lastError;
}

