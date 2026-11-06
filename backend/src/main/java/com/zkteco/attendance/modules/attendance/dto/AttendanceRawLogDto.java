package com.zkteco.attendance.modules.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceRawLogDto {
    private Long id;
    private Long deviceId;
    private String deviceName;
    private String deviceSn;
    private String devicePin;
    private String employeeName;
    private String employeeCode;
    private Instant punchTime;
    private String verifyType;
    private String punchState;
    private String workCode;
    private boolean processed;
    private Instant processedAt;
    private Instant createdAt;
}

