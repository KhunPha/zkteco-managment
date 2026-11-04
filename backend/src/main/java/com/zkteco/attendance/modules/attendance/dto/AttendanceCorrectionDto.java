package com.zkteco.attendance.modules.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceCorrectionDto {
    private Long id;
    private Long employeeId;
    private String employeeCode;
    private String employeeName;
    private Long attendanceRecordId;
    private LocalDate attendanceDate;
    private Instant originalCheckIn;
    private Instant originalCheckOut;
    private Instant requestedCheckIn;
    private Instant requestedCheckOut;
    private String reason;
    private String status;
    private Long approverId;
    private String approverName;
    private Instant approvedAt;
    private String rejectionReason;
    private Instant createdAt;
}

