package com.zkteco.attendance.modules.personnel.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromoteStudentsResult {
    private int totalProcessed;
    private int totalPromoted;
    private int totalGraduated;
    private String targetAcademicYear;
    private Map<String, Integer> gradeBreakdown;
    private String message;
}

