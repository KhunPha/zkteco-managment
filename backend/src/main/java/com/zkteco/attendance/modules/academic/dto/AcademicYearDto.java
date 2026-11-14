package com.zkteco.attendance.modules.academic.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AcademicYearDto {
    private Long id;
    private String code;
    private String name;
    private String khmerName;
    private LocalDate startDate;
    private LocalDate endDate;
    private Boolean isCurrent;
    private String companyCode;
    private long gradeCount;
    private long classCount;
    private long studentCount;
    private Instant createdAt;
    private Instant updatedAt;
}

