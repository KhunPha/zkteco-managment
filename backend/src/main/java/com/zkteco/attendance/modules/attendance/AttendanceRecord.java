package com.zkteco.attendance.modules.attendance;

import com.zkteco.attendance.common.BaseEntity;
import com.zkteco.attendance.modules.device.AttendanceDevice;
import com.zkteco.attendance.modules.personnel.Employee;
import com.zkteco.attendance.modules.personnel.Student;
import com.zkteco.attendance.modules.shift.Shift;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "attendance_records", uniqueConstraints = {
        @UniqueConstraint(name = "uq_emp_att_date", columnNames = {"employee_id", "attendance_date"}),
        @UniqueConstraint(name = "uq_student_att_date", columnNames = {"student_id", "attendance_date"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceRecord extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id")
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id")
    private Shift shift;

    @Column(name = "first_check_in")
    private Instant firstCheckIn;

    @Column(name = "shift1_check_out")
    private Instant shift1CheckOut;

    @Column(name = "shift2_check_in")
    private Instant shift2CheckIn;

    @Column(name = "last_check_out")
    private Instant lastCheckOut;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "in_device_id")
    private AttendanceDevice inDevice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "out_device_id")
    private AttendanceDevice outDevice;

    @Builder.Default
    @Column(name = "total_work_minutes", nullable = false)
    private int totalWorkMinutes = 0;

    @Builder.Default
    @Column(name = "late_minutes", nullable = false)
    private int lateMinutes = 0;

    @Builder.Default
    @Column(name = "early_leave_minutes", nullable = false)
    private int earlyLeaveMinutes = 0;

    @Builder.Default
    @Column(name = "overtime_minutes", nullable = false)
    private int overtimeMinutes = 0;

    @Builder.Default
    @Column(name = "break_minutes", nullable = false)
    private int breakMinutes = 0;

    @Builder.Default
    @Column(nullable = false, length = 50)
    private String status = "ABSENT"; // PRESENT, LATE, EARLY_DEPARTURE, ABSENT, HALF_DAY, ON_LEAVE, HOLIDAY, REST_DAY

    @Builder.Default
    @Column(name = "is_manual_adjusted", nullable = false)
    private boolean manualAdjusted = false;

    @Column(columnDefinition = "TEXT")
    private String remarks;
}

