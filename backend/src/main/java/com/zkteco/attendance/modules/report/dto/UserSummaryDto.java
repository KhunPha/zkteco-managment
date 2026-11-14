package com.zkteco.attendance.modules.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSummaryDto {
    private String code;
    private String name;
    private String khmerName;
    private String personnelType;
    private String departmentOrClass;
    private String branchName;
    private Long employeeId;
    private Long studentId;
    private int daysActive;
    private int present;
    private int late;
    private int absent;
    private int onLeave;
    private int holiday;
    private int totalWorkMinutes;
    private int totalLateMinutes;
    private double totalHours;
    private int punctualityRate;
}

