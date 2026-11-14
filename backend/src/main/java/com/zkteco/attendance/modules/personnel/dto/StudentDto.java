package com.zkteco.attendance.modules.personnel.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentDto {
    private Long id;
    private String studentCode;
    private String idNumber;
    private String khmerName;
    private String englishName;
    private String gender;
    private String className;
    private String grade;
    private String academicYear;
    private String parentContact;
    private String status;
    private Long branchId;
    private String branchName;
    private String branchCode;
    private String profileImageUrl;
    private String companyCode;
    private Boolean scheduleAssigned;
    private String currentShiftName;
}

