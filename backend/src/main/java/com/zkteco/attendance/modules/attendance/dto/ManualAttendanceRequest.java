package com.zkteco.attendance.modules.attendance.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;

@Data
public class ManualAttendanceRequest {
    private Long employeeId;
    private Long studentId;

    @NotNull(message = "Attendance date is required")
    private LocalDate attendanceDate;

    private Long shiftId;
    private Instant firstCheckIn;
    private Instant lastCheckOut;
    private String status; // PRESENT, LATE, EARLY_DEPARTURE, ABSENT, HALF_DAY, ON_LEAVE
    private String remarks;
}

