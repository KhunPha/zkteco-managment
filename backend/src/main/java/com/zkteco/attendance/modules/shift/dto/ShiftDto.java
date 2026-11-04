package com.zkteco.attendance.modules.shift.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShiftDto {
    private Long id;
    private String code;
    private String name;
    private LocalTime startTime;
    private LocalTime endTime;
    private LocalTime breakStart;
    private LocalTime breakEnd;
    private int graceLateMinutes;
    private int graceEarlyLeaveMinutes;
    private BigDecimal workHours;
    private boolean overnight;
    private boolean flexible;
    private boolean requiresCheckout;
    private boolean active;
}

