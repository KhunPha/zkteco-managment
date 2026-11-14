package com.zkteco.attendance.modules.academic;

import com.zkteco.attendance.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "academic_grades")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AcademicGrade extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name; // e.g. "Grade 10", "Grade 12"

    @Column(name = "khmer_name", length = 100)
    private String khmerName; // e.g. "ថ្នាក់ទី ១០"

    @Column(name = "academic_year", nullable = false, length = 50)
    private String academicYear; // e.g. "2026-2027"

    @Builder.Default
    @Column(name = "sequence_order", nullable = false)
    private Integer sequenceOrder = 1;

    @Column(length = 255)
    private String description;

    @Column(name = "company_code", length = 50, nullable = false)
    private String companyCode;

    @Column(name = "deleted_at")
    private java.time.Instant deletedAt;
}
