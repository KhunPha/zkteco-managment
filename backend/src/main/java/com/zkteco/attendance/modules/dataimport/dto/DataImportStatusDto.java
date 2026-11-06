package com.zkteco.attendance.modules.dataimport.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DataImportStatusDto {
    private long totalDevices;
    private long totalEmployees;
    private long totalDeviceUsers;
    private long totalRawLogs;
    private long adminCount;
    private long enrollerCount;
    private long normalUserCount;
    private List<UserRoleSummary> privilegedUsers;
    private List<BackupFileSummary> availableBackups;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserRoleSummary {
        private String pin;
        private String name;
        private String role;
        private String cardNumber;
        private int fingerprintCount;
        private String deviceName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BackupFileSummary {
        private String fileName;
        private long fileSize;
        private String description;
        private int estimatedUsers;
        private int estimatedLogs;
    }
}

