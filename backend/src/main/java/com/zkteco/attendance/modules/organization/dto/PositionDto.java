package com.zkteco.attendance.modules.organization.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PositionDto {
    private Long id;
    private String code;
    private String title;
    private String description;
    private boolean active;
}

