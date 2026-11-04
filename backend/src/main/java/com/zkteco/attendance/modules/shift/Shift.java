package com.zkteco.attendance.modules.shift;

import com.zkteco.attendance.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "shifts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Shift extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "break_start")
    private LocalTime breakStart;

    @Column(name = "break_end")
    private LocalTime breakEnd;

    @Builder.Default
    @Column(name = "grace_late_minutes", nullable = false)
    private int graceLateMinutes = 15;

    @Builder.Default
    @Column(name = "grace_early_leave_minutes", nullable = false)
    private int graceEarlyLeaveMinutes = 15;

    @Builder.Default
    @Column(name = "work_hours", nullable = false, precision = 4, scale = 2)
    private BigDecimal workHours = new BigDecimal("8.00");

    @Builder.Default
    @Column(name = "is_overnight", nullable = false)
    private boolean overnight = false;

    @Builder.Default
    @Column(name = "is_flexible", nullable = false)
    private boolean flexible = false;

    @Builder.Default
    @Column(name = "requires_checkout", nullable = false)
    private boolean requiresCheckout = true;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Builder.Default
    @OneToMany(mappedBy = "shift", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ShiftBreak> breaks = new ArrayList<>();
}

