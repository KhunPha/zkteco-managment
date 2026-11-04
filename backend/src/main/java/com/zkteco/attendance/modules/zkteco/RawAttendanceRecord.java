package com.zkteco.attendance.modules.zkteco;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RawAttendanceRecord {
    private String deviceSerialNumber;
    private String userPin;
    private Instant punchTime;
    private String verifyType; // FINGERPRINT, FACE, CARD, PASSWORD, OTHER
    private String punchState; // CHECK_IN, CHECK_OUT, BREAK_OUT, BREAK_IN, OVERTIME_IN, OVERTIME_OUT, UNKNOWN
    private String workCode;
    private String rawPayload;
}

