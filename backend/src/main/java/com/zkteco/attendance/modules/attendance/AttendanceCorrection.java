package com.zkteco.attendance.modules.attendance;

import com.zkteco.attendance.common.BaseEntity;
import com.zkteco.attendance.modules.personnel.Employee;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "attendance_corrections")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceCorrection extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attendance_record_id")
    private AttendanceRecord attendanceRecord;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Column(name = "original_check_in")
    private Instant originalCheckIn;

    @Column(name = "original_check_out")
    private Instant originalCheckOut;

    @Column(name = "requested_check_in")
    private Instant requestedCheckIn;

    @Column(name = "requested_check_out")
    private Instant requestedCheckOut;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Builder.Default
    @Column(nullable = false, length = 50)
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approver_id")
    private Employee approver;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;
}

