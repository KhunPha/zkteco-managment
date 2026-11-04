package com.zkteco.attendance.modules.shift;

import com.zkteco.attendance.common.BaseEntity;
import com.zkteco.attendance.modules.personnel.Employee;
import jakarta.persistence.*;
import lombok.*;

import java.time.DayOfWeek;
import java.time.LocalDate;

@Entity
@Table(name = "employee_schedules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeSchedule extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id", nullable = false)
    private Shift shift;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Builder.Default
    @Column(nullable = false)
    private boolean monday = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean tuesday = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean wednesday = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean thursday = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean friday = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean saturday = false;

    @Builder.Default
    @Column(nullable = false)
    private boolean sunday = false;

    public boolean isWorkingDay(DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case MONDAY -> monday;
            case TUESDAY -> tuesday;
            case WEDNESDAY -> wednesday;
            case THURSDAY -> thursday;
            case FRIDAY -> friday;
            case SATURDAY -> saturday;
            case SUNDAY -> sunday;
        };
    }
}

