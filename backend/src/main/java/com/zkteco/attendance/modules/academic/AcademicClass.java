package com.zkteco.attendance.modules.academic;

import com.zkteco.attendance.common.BaseEntity;
import com.zkteco.attendance.modules.organization.Branch;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "academic_classes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AcademicClass extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name; // e.g. "Class 10A"

    @Column(name = "khmer_name", length = 100)
    private String khmerName; // e.g. "ថ្នាក់ ១០A"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grade_id")
    private AcademicGrade grade;

    @Column(name = "grade_name", nullable = false, length = 50)
    private String gradeName; // e.g. "Grade 10"

    @Column(name = "academic_year", nullable = false, length = 50)
    private String academicYear; // e.g. "2026-2027"

    @Column(name = "room_number", length = 50)
    private String roomNumber;

    @Column(name = "homeroom_teacher_id")
    private Long homeroomTeacherId;

    @Column(name = "homeroom_teacher_name", length = 150)
    private String homeroomTeacherName;

    @Column(name = "telegram_chat_id", length = 100)
    private String telegramChatId;

    @Builder.Default
    @Column(name = "max_students", nullable = false)
    private Integer maxStudents = 40;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @Column(name = "company_code", length = 50, nullable = false)
    private String companyCode;

    @Column(name = "deleted_at")
    private java.time.Instant deletedAt;
}
