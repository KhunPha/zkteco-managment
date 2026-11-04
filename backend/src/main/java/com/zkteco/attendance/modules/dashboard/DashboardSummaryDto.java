package com.zkteco.attendance.modules.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryDto {
    private long totalEmployees;
    private long totalStudents;
    private long presentToday;
    private long absentToday;
    private long lateToday;
    private long onLeaveToday;
    private long currentlyWorking;
    private double attendancePercentage;

    private long devicesOnline;
    private long devicesOffline;

    private List<DailyTrendDto> weeklyTrend;
    private List<DepartmentStatDto> departmentStats;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyTrendDto {
        private String date;
        private long present;
        private long late;
        private long absent;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DepartmentStatDto {
        private String departmentName;
        private long employeeCount;
        private long presentCount;
    }
}

