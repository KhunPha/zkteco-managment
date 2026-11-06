package com.zkteco.attendance.modules.biometric.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FacePunchResponse {

    private Long rawLogId;
    private String devicePin;
    private String personnelCode;
    private String personName;
    private String khmerName;
    private String personnelType;
    private String departmentOrClass;
    private String photoUrl;
    private Instant punchTime;
    private String punchState;
    private String status;
    private String message;
}

