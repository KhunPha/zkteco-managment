package com.zkteco.attendance.modules.academic.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AcademicGradeDto {
    private Long id;
    private String name;
    private String khmerName;
    private String academicYear;
    private Integer sequenceOrder;
    private String description;
    private String companyCode;
    private long classCount;
    private long studentCount;
    private Instant createdAt;
    private Instant updatedAt;
}

