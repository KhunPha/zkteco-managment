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
public class LiveScanEventDto {
    private Long logId;
    private Long deviceId;
    private String deviceName;
    private String deviceSn;
    private String devicePin;
    private String personnelName;
    private String personnelKhmerName;
    private String personnelCode;
    private String personnelType; // STUDENT, TEACHER, EMPLOYEE
    private String departmentOrClass;
    private String cardNumber;
    private String profileImageUrl;
    private Instant punchTime;
    private String verifyType;
    private String punchState;
    private String statusMessage;
}

