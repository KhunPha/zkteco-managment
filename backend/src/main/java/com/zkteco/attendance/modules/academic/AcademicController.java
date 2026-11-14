package com.zkteco.attendance.modules.academic;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.modules.academic.dto.*;
import com.zkteco.attendance.modules.personnel.dto.StudentDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/academic")
@RequiredArgsConstructor
@Tag(name = "Academic Management", description = "Academic Years, Grades, and Classrooms per Academic Year")
public class AcademicController {

    private final AcademicService academicService;

    // =========================================================================
    // 1. ACADEMIC YEARS
    // =========================================================================

    @GetMapping("/years")
    @Operation(summary = "List all academic years for the current institution")
    public ResponseEntity<ApiResponse<List<AcademicYearDto>>> getAcademicYears() {
        return ResponseEntity.ok(ApiResponse.ok(academicService.getAcademicYears()));
    }

    @PostMapping("/years")
    @Operation(summary = "Create a new academic year")
    public ResponseEntity<ApiResponse<AcademicYearDto>> createAcademicYear(@Valid @RequestBody CreateAcademicYearRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Academic year created", academicService.createAcademicYear(request)));
    }

    @PutMapping("/years/{id}")
    @Operation(summary = "Update an existing academic year")
    public ResponseEntity<ApiResponse<AcademicYearDto>> updateAcademicYear(
            @PathVariable Long id,
            @Valid @RequestBody CreateAcademicYearRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(academicService.updateAcademicYear(id, request)));
    }

    @PutMapping("/years/{id}/current")
    @Operation(summary = "Set academic year as active/current")
    public ResponseEntity<ApiResponse<AcademicYearDto>> setCurrentAcademicYear(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(academicService.setCurrentAcademicYear(id)));
    }

    @DeleteMapping("/years/{id}")
    @Operation(summary = "Soft delete an academic year")
    public ResponseEntity<ApiResponse<Void>> deleteAcademicYear(@PathVariable Long id) {
        academicService.deleteAcademicYear(id);
        return ResponseEntity.ok(ApiResponse.ok("Academic year deleted successfully", null));
    }

    // =========================================================================
    // 2. ACADEMIC GRADES
    // =========================================================================

    @GetMapping("/grades")
    @Operation(summary = "List academic grades, optionally filtered by academic year")
    public ResponseEntity<ApiResponse<List<AcademicGradeDto>>> getGrades(
            @RequestParam(required = false) String academicYear) {
        return ResponseEntity.ok(ApiResponse.ok(academicService.getGrades(academicYear)));
    }

    @PostMapping("/grades")
    @Operation(summary = "Create a new academic grade level for an academic year")
    public ResponseEntity<ApiResponse<AcademicGradeDto>> createGrade(@Valid @RequestBody CreateAcademicGradeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Grade created", academicService.createGrade(request)));
    }

    @PutMapping("/grades/{id}")
    @Operation(summary = "Update an academic grade")
    public ResponseEntity<ApiResponse<AcademicGradeDto>> updateGrade(
            @PathVariable Long id,
            @Valid @RequestBody CreateAcademicGradeRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(academicService.updateGrade(id, request)));
    }

    @DeleteMapping("/grades/{id}")
    @Operation(summary = "Delete an academic grade")
    public ResponseEntity<ApiResponse<Void>> deleteGrade(@PathVariable Long id) {
        academicService.deleteGrade(id);
        return ResponseEntity.ok(ApiResponse.ok("Academic grade deleted successfully", null));
    }

    // =========================================================================
    // 3. ACADEMIC CLASSES
    // =========================================================================

    @GetMapping("/classes")
    @Operation(summary = "List classes filtered by academic year and optional grade")
    public ResponseEntity<ApiResponse<List<AcademicClassDto>>> getClasses(
            @RequestParam(required = false) String academicYear,
            @RequestParam(required = false) String gradeName) {
        return ResponseEntity.ok(ApiResponse.ok(academicService.getClasses(academicYear, gradeName)));
    }

    @PostMapping("/classes")
    @Operation(summary = "Create a new class / classroom for an academic year")
    public ResponseEntity<ApiResponse<AcademicClassDto>> createClass(@Valid @RequestBody CreateAcademicClassRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Class created", academicService.createClass(request)));
    }

    @PutMapping("/classes/{id}")
    @Operation(summary = "Update a class / classroom")
    public ResponseEntity<ApiResponse<AcademicClassDto>> updateClass(
            @PathVariable Long id,
            @Valid @RequestBody CreateAcademicClassRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(academicService.updateClass(id, request)));
    }

    @DeleteMapping("/classes/{id}")
    @Operation(summary = "Delete a class / classroom")
    public ResponseEntity<ApiResponse<Void>> deleteClass(@PathVariable Long id) {
        academicService.deleteClass(id);
        return ResponseEntity.ok(ApiResponse.ok("Academic class deleted successfully", null));
    }

    @GetMapping("/classes/{id}/students")
    @Operation(summary = "List all students enrolled in a specific class")
    public ResponseEntity<ApiResponse<List<StudentDto>>> getClassStudents(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(academicService.getClassStudents(id)));
    }

    // =========================================================================
    // 4. CLONE / DUPLICATE STRUCTURE
    // =========================================================================

    @PostMapping("/copy-structure")
    @Operation(summary = "Clone grades and classes from a previous academic year into a new year")
    public ResponseEntity<ApiResponse<Map<String, Object>>> copyAcademicStructure(
            @Valid @RequestBody CopyAcademicStructureRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(academicService.copyAcademicStructure(request)));
    }
}
