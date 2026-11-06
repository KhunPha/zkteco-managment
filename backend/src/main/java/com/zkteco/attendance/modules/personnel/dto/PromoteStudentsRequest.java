package com.zkteco.attendance.modules.personnel.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromoteStudentsRequest {

    /**
     * Promotion mode:
     * - "FULL_ROLLOVER": Auto-advance all grades (Grade 7->8->9->10->11->12->Graduated)
     * - "BY_GRADE": Advance students matching a specific sourceGrade (and optional sourceClass)
     * - "SELECTED": Advance only the specific student IDs provided
     */
    private String mode; // FULL_ROLLOVER, BY_GRADE, SELECTED

    /**
     * Target Academic Year to assign to promoted students, e.g. "2027-2028".
     */
    private String targetAcademicYear;

    /**
     * Source Academic Year to filter from (optional), e.g. "2026-2027".
     */
    private String sourceAcademicYear;

    /**
     * When mode == "BY_GRADE": the grade to promote from (e.g. "Grade 11")
     */
    private String sourceGrade;

    /**
     * When mode == "BY_GRADE" or "SELECTED": the target grade to advance into (e.g. "Grade 12" or "GRADUATED")
     */
    private String targetGrade;

    /**
     * Optional source class name filter (e.g. "Class 11A")
     */
    private String sourceClassName;

    /**
     * Optional target class name (e.g. "Class 12A")
     */
    private String targetClassName;

    /**
     * When mode == "SELECTED": list of student IDs to promote
     */
    private List<Long> studentIds;

    /**
     * Optional list of student IDs to exclude from promotion (e.g. students who failed or need to repeat)
     */
    private List<Long> excludedStudentIds;

    /**
     * Auto-advance class numbers (e.g. "Class 11A" -> "Class 12A", "Grade 10B" -> "Grade 11B")
     */
    @Builder.Default
    private boolean autoIncrementClassNumber = true;

    /**
     * Target status for promoted students ("ACTIVE", "GRADUATED", etc.)
     */
    @Builder.Default
    private String newStatus = "ACTIVE";
}

