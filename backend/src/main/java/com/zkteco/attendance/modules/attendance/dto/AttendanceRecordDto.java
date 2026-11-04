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
public class AttendanceRecordDto {
    private Long id;
    private LocalDate attendanceDate;
    private Long employeeId;
    private String employeeCode;
    private String employeeName;
    private Long departmentId;
    private String departmentName;
    private Long studentId;
    private String studentCode;
    private String studentName;
    private Long shiftId;
    private String shiftName;
    private Instant firstCheckIn;
    private Instant lastCheckOut;
    private String inDeviceName;
    private String outDeviceName;
    private int totalWorkMinutes;
    private int lateMinutes;
    private int earlyLeaveMinutes;
    private int overtimeMinutes;
    private int breakMinutes;
    private String status;
    private boolean manualAdjusted;
    private String remarks;
}

