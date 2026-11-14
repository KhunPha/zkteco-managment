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
public class BackupRecordDto {
    private Long id;
    private String companyCode;
    private String filename;
    private Long fileSizeBytes;
    private String formattedSize;
    private String backupType;
    private String status;
    private String errorMessage;
    private String gdriveFileId;
    private String gdriveWebViewLink;
    private String gdriveStatus;
    private String gdriveError;
    private Instant createdAt;
    private Instant completedAt;
}

