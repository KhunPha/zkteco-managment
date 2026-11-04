package com.zkteco.attendance.modules.leave.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveTypeDto {
    private Long id;
    private String code;
    private String name;
    private String description;
    private boolean paid;
    private int defaultDaysPerYear;
    private boolean requiresApproval;
    private boolean active;
}

