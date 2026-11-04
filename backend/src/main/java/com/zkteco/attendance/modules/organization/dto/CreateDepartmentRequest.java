package com.zkteco.attendance.modules.organization.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateDepartmentRequest {
    private Long branchId;

    @NotBlank(message = "Department code is required")
    private String code;

    @NotBlank(message = "Department name is required")
    private String name;

    private Long parentId;
    private Boolean active;
}

