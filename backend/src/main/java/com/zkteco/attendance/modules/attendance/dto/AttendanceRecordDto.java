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
    private String studentGrade;
    private String studentClassName;
    private String personnelType; // EMPLOYEE, TEACHER, STUDENT
    private Long shiftId;
    private String shiftName;
    private Instant firstCheckIn; // Shift 1 First Check-In
    private Instant shift1CheckIn; // Alias for firstCheckIn
    private Instant shift1CheckOut; // Shift 1 Last Check-Out (Lunch Out)
    private Instant shift2CheckIn; // Shift 2 First Check-In (Lunch In)
    private Instant lastCheckOut; // Shift 2 Last Check-Out (Evening Out)
    private Instant shift2CheckOut; // Alias for lastCheckOut
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

