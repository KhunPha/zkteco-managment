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
public class CopyAcademicStructureRequest {
    @NotBlank(message = "Source academic year is required (e.g. 2026-2027)")
    private String sourceAcademicYear;

    @NotBlank(message = "Target academic year is required (e.g. 2027-2028)")
    private String targetAcademicYear;

    private Boolean copyTelegramChatIds;
}

