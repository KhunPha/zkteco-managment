package com.zkteco.attendance.modules.backup.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestGDriveResponse {
    private boolean success;
    private String clientEmail;
    private String folderName;
    private String message;
    private String error;
}

