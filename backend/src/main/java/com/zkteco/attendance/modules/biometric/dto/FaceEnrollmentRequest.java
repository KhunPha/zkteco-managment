package com.zkteco.attendance.modules.biometric.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FaceEnrollmentRequest {

    @NotBlank(message = "Device PIN / Code is required")
    private String devicePin;

    private String personnelType; // EMPLOYEE, TEACHER, STUDENT

    private Long employeeId;

    private Long studentId;

    private String personName;

    @NotBlank(message = "Photo image data (base64) is required")
    private String photoBase64;

    private List<Float> descriptor; // 128 float array

    private String descriptorJson; // Optional alternative if sent as string
}

