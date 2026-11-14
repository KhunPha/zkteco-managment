package com.zkteco.attendance.modules.academic.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAcademicGradeRequest {
    @NotBlank(message = "Grade name is required (e.g. Grade 10)")
    private String name;

    private String khmerName;

    @NotBlank(message = "Academic year is required")
    private String academicYear;

    private Integer sequenceOrder;
    private String description;
}

