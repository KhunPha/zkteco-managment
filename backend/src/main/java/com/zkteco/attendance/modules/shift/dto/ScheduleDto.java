package com.zkteco.attendance.modules.shift.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleDto {
    private Long id;
    private String personnelType; // "EMPLOYEE", "TEACHER", "STUDENT"
    private Long employeeId;
    private String employeeCode;
    private String employeeName;
    private Long studentId;
    private String studentCode;
    private String studentName;
    private String className;
    private String grade;
    private String departmentName;
    private String branchName;
    private Long shiftId;
    private String shiftName;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private boolean monday;
    private boolean tuesday;
    private boolean wednesday;
    private boolean thursday;
    private boolean friday;
    private boolean saturday;
    private boolean sunday;
}

