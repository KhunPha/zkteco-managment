package com.zkteco.attendance.modules.shift.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnassignedScheduleSummaryDto {
    private long unassignedEmployeesCount;
    private long unassignedTeachersCount;
    private long unassignedStudentsCount;
    private long totalActiveEmployees;
    private long totalActiveTeachers;
    private long totalActiveStudents;
    private List<UnassignedPersonItem> unassignedEmployees;
    private List<UnassignedPersonItem> unassignedTeachers;
    private List<UnassignedPersonItem> unassignedStudents;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UnassignedPersonItem {
        private Long id;
        private String code;
        private String idNumber;
        private String name;
        private String personnelType; // "EMPLOYEE", "TEACHER", "STUDENT"
        private String departmentOrClass;
        private String branchName;
    }
}

