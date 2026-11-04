package com.zkteco.attendance.modules.personnel.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeDto {
    private Long id;
    private Long userId;
    private String employeeCode;
    private String khmerName;
    private String englishName;
    private String gender;
    private LocalDate dateOfBirth;
    private String email;
    private String phoneNumber;
    private String address;
    private Long departmentId;
    private String departmentName;
    private Long positionId;
    private String positionTitle;
    private Long branchId;
    private String branchName;
    private String employmentType;
    private LocalDate employmentStartDate;
    private LocalDate employmentEndDate;
    private String employmentStatus;
    private String profileImageUrl;
    private Long supervisorId;
    private String supervisorName;
}

