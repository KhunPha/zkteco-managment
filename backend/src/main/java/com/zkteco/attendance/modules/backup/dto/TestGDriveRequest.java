package com.zkteco.attendance.modules.backup.dto;

import lombok.Data;

@Data
public class TestGDriveRequest {
    private String serviceAccountJson;
    private String folderId;
}

