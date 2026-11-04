package com.zkteco.attendance.modules.attendance.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ApproveCorrectionRequest {
    @NotNull(message = "Approved status flag is required")
    private Boolean approved;

    private String rejectionReason;
}

