package com.zkteco.attendance.modules.leave.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateHolidayRequest {
    @NotBlank(message = "Holiday name is required")
    private String name;

    @NotNull(message = "Holiday date (start date) is required")
    private LocalDate holidayDate;

    // Optional end date for multi-day holidays (e.g. Khmer New Year 3-day range)
    private LocalDate endDate;

    private Boolean recurring;
    private Boolean affectsTeachers;
    private Boolean affectsStudents;
}
