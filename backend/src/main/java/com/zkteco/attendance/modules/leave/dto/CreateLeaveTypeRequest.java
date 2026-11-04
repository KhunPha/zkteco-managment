package com.zkteco.attendance.modules.leave.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateLeaveTypeRequest {
    @NotBlank(message = "Leave type code is required")
    private String code;

    @NotBlank(message = "Leave type name is required")
    private String name;

    private String description;
    private Boolean paid;
    private Integer defaultDaysPerYear;
    private Boolean requiresApproval;
    private Boolean active;
}

