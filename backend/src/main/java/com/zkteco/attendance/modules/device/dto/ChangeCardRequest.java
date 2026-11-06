package com.zkteco.attendance.modules.device.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ChangeCardRequest {
    @NotBlank(message = "New card number is required")
    private String newCardNumber;

    private String academicYear; // e.g. "2026-2027"

    private String notes; // e.g. "Annual renewal", "Lost card replacement"

    private LocalDate issuedDate; // defaults to today if null

    private LocalDate expiryDate; // optional
}

