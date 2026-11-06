package com.zkteco.attendance.modules.device.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CardHistoryDto {
    private Long id;
    private String devicePin;
    private String cardNumber;
    private String previousCardNumber;
    private String academicYear;
    private String status;
    private LocalDate issuedDate;
    private LocalDate expiryDate;
    private Instant replacedAt;
    private String notes;
    private Long employeeId;
    private String employeeName;
    private Long studentId;
    private String studentName;
    private Instant createdAt;
}

