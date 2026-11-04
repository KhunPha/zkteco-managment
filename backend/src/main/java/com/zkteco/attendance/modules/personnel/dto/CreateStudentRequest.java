package com.zkteco.attendance.modules.personnel.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateStudentRequest {
    @NotBlank(message = "Student code is required")
    private String studentCode;

    private String khmerName;

    @NotBlank(message = "English name is required")
    private String englishName;

    @NotBlank(message = "Gender is required")
    private String gender;

    private String className;
    private String grade;
    private String academicYear;
    private String parentContact;
    private String status;
}

