package com.zkteco.attendance.modules.personnel;

import com.zkteco.attendance.common.BaseEntity;
import com.zkteco.attendance.modules.organization.Branch;
import com.zkteco.attendance.modules.organization.Department;
import com.zkteco.attendance.modules.organization.Position;
import com.zkteco.attendance.modules.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "employees")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Employee extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "employee_code", nullable = false, unique = true, length = 50)
    private String employeeCode;

    @Column(name = "khmer_name", length = 150)
    private String khmerName;

    @Column(name = "english_name", nullable = false, length = 150)
    private String englishName;

    @Column(nullable = false, length = 10)
    private String gender; // MALE, FEMALE, OTHER

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(length = 150)
    private String email;

    @Column(name = "phone_number", length = 50)
    private String phoneNumber;

    @Column(columnDefinition = "TEXT")
    private String address;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "position_id")
    private Position position;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @Builder.Default
    @Column(name = "employment_type", nullable = false, length = 50)
    private String employmentType = "FULL_TIME"; // FULL_TIME, PART_TIME, CONTRACT, INTERN

    @Column(name = "employment_start_date", nullable = false)
    private LocalDate employmentStartDate;

    @Column(name = "employment_end_date")
    private LocalDate employmentEndDate;

    @Builder.Default
    @Column(name = "employment_status", nullable = false, length = 50)
    private String employmentStatus = "ACTIVE"; // ACTIVE, PROBATION, SUSPENDED, TERMINATED, RESIGNED

    @Column(name = "profile_image_url", columnDefinition = "TEXT")
    private String profileImageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supervisor_id")
    private Employee supervisor;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}

