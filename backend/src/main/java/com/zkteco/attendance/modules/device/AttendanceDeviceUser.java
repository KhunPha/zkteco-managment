package com.zkteco.attendance.modules.device;

import com.zkteco.attendance.common.BaseEntity;
import com.zkteco.attendance.modules.personnel.Employee;
import com.zkteco.attendance.modules.personnel.Student;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "attendance_device_users", uniqueConstraints = {
        @UniqueConstraint(name = "uq_device_pin", columnNames = {"device_id", "device_pin"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceDeviceUser extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private AttendanceDevice device;

    @Column(name = "device_pin", nullable = false, length = 50)
    private String devicePin;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id")
    private Student student;

    @Column(name = "name_on_device", length = 150)
    private String nameOnDevice;

    @Builder.Default
    @Column(nullable = false, length = 50)
    private String privilege = "NORMAL_USER"; // NORMAL_USER, ENROLLER, ADMIN, SUPER_ADMIN

    @Column(name = "card_number", length = 50)
    private String cardNumber;

    @Column(length = 50)
    private String password;

    @Builder.Default
    @Column(name = "face_enrolled", nullable = false)
    private boolean faceEnrolled = false;

    @Builder.Default
    @Column(name = "fingerprint_count", nullable = false)
    private int fingerprintCount = 0;

    @Builder.Default
    @Column(name = "sync_status", nullable = false, length = 50)
    private String syncStatus = "SYNCED"; // SYNCED, PENDING_UPLOAD, PENDING_DELETE, ERROR

    @Column(name = "last_synced_at")
    private Instant lastSyncedAt;
}

