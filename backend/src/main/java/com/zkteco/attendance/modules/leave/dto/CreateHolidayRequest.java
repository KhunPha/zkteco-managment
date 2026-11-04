package com.zkteco.attendance.modules.leave.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateHolidayRequest {
    @NotBlank(message = "Holiday name is required")
    private String name;

    @NotNull(message = "Holiday date is required")
    private LocalDate holidayDate;

    private Boolean recurring;
    private Boolean affectsTeachers;
    private Boolean affectsStudents;
}

