package com.zkteco.attendance.modules.academic.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAcademicClassRequest {
    @NotBlank(message = "Class name is required (e.g. Class 10A)")
    private String name;

    private String khmerName;

    private Long gradeId;

    @NotBlank(message = "Grade name is required")
    private String gradeName;

    @NotBlank(message = "Academic year is required")
    private String academicYear;

    private String roomNumber;
    private Long homeroomTeacherId;
    private String homeroomTeacherName;
    private String telegramChatId;
    private Integer maxStudents;
    private Long branchId;
}

