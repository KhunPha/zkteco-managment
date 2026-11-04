package com.zkteco.attendance.modules.organization.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreatePositionRequest {
    @NotBlank(message = "Position code is required")
    private String code;

    @NotBlank(message = "Position title is required")
    private String title;

    private String description;
    private Boolean active;
}

