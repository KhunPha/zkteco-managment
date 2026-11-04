package com.zkteco.attendance.modules.organization.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateBranchRequest {
    @NotBlank(message = "Branch code is required")
    private String code;

    @NotBlank(message = "Branch name is required")
    private String name;

    private String address;
    private String phone;
    private String email;
    private Boolean active;
}

