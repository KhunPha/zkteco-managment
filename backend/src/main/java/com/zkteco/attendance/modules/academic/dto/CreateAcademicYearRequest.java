package com.zkteco.attendance.modules.academic.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAcademicYearRequest {
    @NotBlank(message = "Year code is required (e.g. 2026-2027)")
    private String code;
    
    private String name;
    private String khmerName;
    private LocalDate startDate;
    private LocalDate endDate;
    private Boolean isCurrent;
}

