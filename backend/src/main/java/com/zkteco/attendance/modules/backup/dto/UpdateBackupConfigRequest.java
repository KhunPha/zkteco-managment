package com.zkteco.attendance.modules.backup.dto;

import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class UpdateBackupConfigRequest {
    private boolean enabled;
    private String frequency; // DAILY, WEEKLY, HOURLY, CUSTOM
    private String cronExpression;
    private String backupTime;
    private String backupDayOfWeek;
    
    @Min(1)
    private int retentionDays = 30;
    
    private boolean includeUploads;
    private boolean gdriveEnabled;
    private String gdriveFolderId;
    private String gdriveAuthType; // SERVICE_ACCOUNT or OAUTH2
    private String gdriveClientId;
    private String gdriveClientSecret;
    private String gdriveServiceAccountJson;
}

