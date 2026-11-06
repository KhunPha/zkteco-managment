package com.zkteco.attendance.modules.leave;

import com.zkteco.attendance.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "holidays")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Holiday extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "holiday_date", nullable = false)
    private LocalDate holidayDate; // Start date of the holiday

    @Column(name = "end_date")
    private LocalDate endDate; // End date of the holiday (inclusive); null if 1-day holiday

    @Builder.Default
    @Column(name = "is_recurring", nullable = false)
    private boolean recurring = false;

    @Builder.Default
    @Column(name = "affects_teachers", nullable = false)
    private boolean affectsTeachers = true;

    @Builder.Default
    @Column(name = "affects_students", nullable = false)
    private boolean affectsStudents = true;
}
