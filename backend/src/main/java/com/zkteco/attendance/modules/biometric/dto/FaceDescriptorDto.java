package com.zkteco.attendance.modules.biometric.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FaceDescriptorDto {

    private Long id;
    private String devicePin;
    private String personnelType; // EMPLOYEE, TEACHER, STUDENT
    private Long employeeId;
    private Long studentId;
    private String personName;
    private String khmerName;
    private String personnelCode;
    private String departmentOrClass;
    private String photoUrl;
    private List<Float> descriptor;
    private Double qualityScore;
}

