package com.zkteco.attendance.modules.shift.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalTime;

@Data
public class CreateShiftRequest {
    @NotBlank(message = "Shift code is required")
    private String code;

    @NotBlank(message = "Shift name is required")
    private String name;

    @NotNull(message = "Start time is required")
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    private LocalTime endTime;

    private LocalTime breakStart;
    private LocalTime breakEnd;
    private Integer graceLateMinutes;
    private Integer graceEarlyLeaveMinutes;
    private BigDecimal workHours;
    private Boolean overnight;
    private Boolean flexible;
    private Boolean requiresCheckout;
    private Boolean active;
}

