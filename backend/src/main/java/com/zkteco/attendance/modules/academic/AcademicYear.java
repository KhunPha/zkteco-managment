package com.zkteco.attendance.modules.academic;

import com.zkteco.attendance.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "academic_years")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AcademicYear extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String code; // e.g. "2026-2027"

    @Column(nullable = false, length = 100)
    private String name; // e.g. "Academic Year 2026-2027"

    @Column(name = "khmer_name", length = 150)
    private String khmerName; // e.g. "ឆ្នាំសិក្សា ២០២៦-២០២៧"

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Builder.Default
    @Column(name = "is_current", nullable = false)
    private Boolean isCurrent = false;

    @Column(name = "company_code", length = 50, nullable = false)
    private String companyCode;

    @Column(name = "deleted_at")
    private java.time.Instant deletedAt;
}
