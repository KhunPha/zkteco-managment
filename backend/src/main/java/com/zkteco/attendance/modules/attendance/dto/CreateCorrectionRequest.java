package com.zkteco.attendance.modules.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;

@Data
public class CreateCorrectionRequest {
    @NotNull(message = "Employee ID is required")
    private Long employeeId;

    @NotNull(message = "Attendance date is required")
    private LocalDate attendanceDate;

    private Long attendanceRecordId;
    private Instant requestedCheckIn;
    private Instant requestedCheckOut;

    @NotBlank(message = "Reason is required")
    private String reason;
}

