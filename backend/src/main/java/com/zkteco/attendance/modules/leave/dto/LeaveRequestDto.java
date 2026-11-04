package com.zkteco.attendance.modules.leave.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveRequestDto {
    private Long id;
    private Long employeeId;
    private String employeeCode;
    private String employeeName;
    private Long leaveTypeId;
    private String leaveTypeCode;
    private String leaveTypeName;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal totalDays;
    private String reason;
    private String status;
    private Long approverId;
    private String approverName;
    private Instant approvedAt;
    private String rejectionReason;
    private Instant createdAt;
}

