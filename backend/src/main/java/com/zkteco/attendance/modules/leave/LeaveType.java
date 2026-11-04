package com.zkteco.attendance.modules.leave;

import com.zkteco.attendance.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "leave_types")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaveType extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    @Column(name = "is_paid", nullable = false)
    private boolean paid = true;

    @Builder.Default
    @Column(name = "default_days_per_year", nullable = false)
    private int defaultDaysPerYear = 18;

    @Builder.Default
    @Column(name = "requires_approval", nullable = false)
    private boolean requiresApproval = true;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}

