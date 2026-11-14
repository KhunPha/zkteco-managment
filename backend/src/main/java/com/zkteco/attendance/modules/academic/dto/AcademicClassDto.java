package com.zkteco.attendance.modules.academic.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AcademicClassDto {
    private Long id;
    private String name;
    private String khmerName;
    private Long gradeId;
    private String gradeName;
    private String academicYear;
    private String roomNumber;
    private Long homeroomTeacherId;
    private String homeroomTeacherName;
    private String telegramChatId;
    private Integer maxStudents;
    private Long branchId;
    private String branchName;
    private String companyCode;
    private long studentCount;
    private Instant createdAt;
    private Instant updatedAt;
}

