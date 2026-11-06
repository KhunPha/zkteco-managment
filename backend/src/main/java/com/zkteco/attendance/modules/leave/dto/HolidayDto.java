package com.zkteco.attendance.modules.leave.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HolidayDto {
    private Long id;
    private String name;
    private LocalDate holidayDate;
    private LocalDate endDate;
    private int daysCount;
    private boolean recurring;
    private boolean affectsTeachers;
    private boolean affectsStudents;
}
