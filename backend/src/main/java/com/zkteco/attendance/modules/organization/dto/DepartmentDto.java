package com.zkteco.attendance.modules.organization.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentDto {
    private Long id;
    private Long branchId;
    private String branchName;
    private String code;
    private String name;
    private Long parentId;
    private String parentName;
    private boolean active;
}

