package com.zkteco.attendance.modules.shift.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class BatchAssignScheduleRequest {
    private List<Long> employeeIds;
    private Long departmentId;
    private Long branchId;

    @NotNull(message = "Shift ID is required")
    private Long shiftId;

    @NotNull(message = "Effective from date is required")
    private LocalDate effectiveFrom;

    private LocalDate effectiveTo;
    private Boolean monday;
    private Boolean tuesday;
    private Boolean wednesday;
    private Boolean thursday;
    private Boolean friday;
    private Boolean saturday;
    private Boolean sunday;
}

