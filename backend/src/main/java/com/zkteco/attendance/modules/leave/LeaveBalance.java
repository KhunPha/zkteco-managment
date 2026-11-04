package com.zkteco.attendance.modules.leave;

import com.zkteco.attendance.common.BaseEntity;
import com.zkteco.attendance.modules.personnel.Employee;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "leave_balances", uniqueConstraints = {
        @UniqueConstraint(name = "uq_emp_leave_year", columnNames = {"employee_id", "leave_type_id", "year"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaveBalance extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leave_type_id", nullable = false)
    private LeaveType leaveType;

    @Column(nullable = false)
    private int year;

    @Builder.Default
    @Column(name = "total_days", nullable = false, precision = 4, scale = 1)
    private BigDecimal totalDays = new BigDecimal("18.0");

    @Builder.Default
    @Column(name = "used_days", nullable = false, precision = 4, scale = 1)
    private BigDecimal usedDays = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "remaining_days", nullable = false, precision = 4, scale = 1)
    private BigDecimal remainingDays = new BigDecimal("18.0");
}

