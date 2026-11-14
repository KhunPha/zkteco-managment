package com.zkteco.attendance.modules.personnel;

import com.zkteco.attendance.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "students")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Student extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_code", nullable = false, length = 50)
    private String studentCode;

    @Column(name = "id_number", length = 100)
    private String idNumber; // Text ID: e.g. FBIS0001 (Student)

    @Column(name = "khmer_name", length = 150)
    private String khmerName;

    @Column(name = "english_name", nullable = false, length = 150)
    private String englishName;

    @Column(nullable = false, length = 10)
    private String gender;

    @Column(name = "class_name", length = 50)
    private String className;

    @Column(length = 50)
    private String grade;

    @Column(name = "academic_year", length = 50)
    private String academicYear;

    @Column(name = "parent_contact", length = 100)
    private String parentContact;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private com.zkteco.attendance.modules.organization.Branch branch;

    @Builder.Default
    @Column(nullable = false, length = 50)
    private String status = "ACTIVE"; // ACTIVE, GRADUATED, SUSPENDED, WITHDRAWN

    @Column(name = "profile_image_url", columnDefinition = "TEXT")
    private String profileImageUrl;

    @Builder.Default
    @Column(name = "company_code", nullable = false, length = 50)
    private String companyCode = "default";

    @Column(name = "deleted_at")
    private Instant deletedAt;
}

