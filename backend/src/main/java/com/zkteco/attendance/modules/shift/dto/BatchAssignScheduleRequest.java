package com.zkteco.attendance.modules.shift.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class BatchAssignScheduleRequest {
    private List<Long> employeeIds;
    private List<Long> studentIds;
    private Long departmentId;
    private Long branchId;
    private String className;
    private String grade;
    private String targetPersonnelType; // "EMPLOYEE", "TEACHER", "STUDENT", "ALL"

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

