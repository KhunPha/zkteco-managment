package com.zkteco.attendance.modules.personnel.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateEmployeeRequest {
    private Long userId;

    @NotBlank(message = "Employee code is required")
    private String employeeCode;

    private String khmerName;

    @NotBlank(message = "English name is required")
    private String englishName;

    @NotBlank(message = "Gender is required")
    private String gender; // MALE, FEMALE, OTHER

    private LocalDate dateOfBirth;
    private String email;
    private String phoneNumber;
    private String address;

    private Long departmentId;
    private Long positionId;
    private Long branchId;

    private String employmentType; // FULL_TIME, PART_TIME, CONTRACT, INTERN

    @NotNull(message = "Employment start date is required")
    private LocalDate employmentStartDate;

    private LocalDate employmentEndDate;
    private String employmentStatus; // ACTIVE, PROBATION, SUSPENDED, TERMINATED, RESIGNED
    private String profileImageUrl;
    private Long supervisorId;
}

