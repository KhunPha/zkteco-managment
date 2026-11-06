package com.zkteco.attendance.modules.biometric;

import com.zkteco.attendance.modules.personnel.Employee;
import com.zkteco.attendance.modules.personnel.Student;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "face_biometrics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FaceBiometric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_pin", nullable = false, unique = true, length = 50)
    private String devicePin;

    @Builder.Default
    @Column(name = "personnel_type", nullable = false, length = 50)
    private String personnelType = "EMPLOYEE"; // EMPLOYEE, TEACHER, STUDENT

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id")
    private Student student;

    @Column(name = "person_name", length = 150)
    private String personName;

    @Column(name = "photo_path", nullable = false, length = 255)
    private String photoPath;

    @Column(name = "descriptor_json", nullable = false, columnDefinition = "TEXT")
    private String descriptorJson;

    @Builder.Default
    @Column(name = "quality_score")
    private Double qualityScore = 1.0;

    @Builder.Default
    @Column(name = "enrolled_at", nullable = false, updatable = false)
    private Instant enrolledAt = Instant.now();

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}

