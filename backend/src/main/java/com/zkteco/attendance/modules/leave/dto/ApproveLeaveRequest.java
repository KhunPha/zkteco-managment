package com.zkteco.attendance.modules.leave.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ApproveLeaveRequest {
    @NotNull(message = "Approved flag is required")
    private Boolean approved;

    private String rejectionReason;
}

