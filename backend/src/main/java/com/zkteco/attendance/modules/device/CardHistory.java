package com.zkteco.attendance.modules.device;

import com.zkteco.attendance.common.BaseEntity;
import com.zkteco.attendance.modules.personnel.Employee;
import com.zkteco.attendance.modules.personnel.Student;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "card_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CardHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_pin", nullable = false, length = 50)
    private String devicePin;

    @Column(name = "card_number", nullable = false, length = 50)
    private String cardNumber;

    @Column(name = "previous_card_number", length = 50)
    private String previousCardNumber;

    @Column(name = "academic_year", length = 50)
    private String academicYear;

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String status = "ACTIVE"; // ACTIVE, REPLACED, EXPIRED, LOST

    @Column(name = "issued_date", nullable = false)
    private LocalDate issuedDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "replaced_at")
    private Instant replacedAt;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id")
    private Student student;
}

