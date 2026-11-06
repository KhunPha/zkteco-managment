package com.zkteco.attendance.modules.biometric.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FacePunchRequest {

    @NotBlank(message = "Device PIN / Code is required")
    private String devicePin;

    @Builder.Default
    private String punchState = "CHECK_IN"; // CHECK_IN, CHECK_OUT, BREAK_OUT, BREAK_IN, OVERTIME_IN, OVERTIME_OUT

    private Double distance; // Euclidean distance from face recognition

    private Double confidence; // Confidence percentage (0-100)

    private java.util.List<Float> descriptor; // 128-d biometric descriptor from client for double verification

    private String snapshotBase64; // Captured camera image frame at recognition moment

    private String deviceName; // Terminal / Kiosk Name
}

