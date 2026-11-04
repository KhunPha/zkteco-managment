package com.zkteco.attendance.modules.organization.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BranchDto {
    private Long id;
    private String code;
    private String name;
    private String address;
    private String phone;
    private String email;
    private boolean active;
}

