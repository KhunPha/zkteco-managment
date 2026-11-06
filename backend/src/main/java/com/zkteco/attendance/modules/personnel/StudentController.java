package com.zkteco.attendance.modules.personnel;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.common.PageResponse;
import com.zkteco.attendance.modules.personnel.dto.CreateStudentRequest;
import com.zkteco.attendance.modules.personnel.dto.PromoteStudentsRequest;
import com.zkteco.attendance.modules.personnel.dto.PromoteStudentsResult;
import com.zkteco.attendance.modules.personnel.dto.StudentDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/students")
@RequiredArgsConstructor
@Tag(name = "Student Management", description = "Student profiles and academic enrollment")
public class StudentController {

    private final StudentService studentService;

    @GetMapping
    @PreAuthorize("hasAuthority('student.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('TEACHER')")
    @Operation(summary = "Get paginated students with filters")
    public ResponseEntity<ApiResponse<PageResponse<StudentDto>>> getStudents(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String className,
            @RequestParam(required = false) String grade,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 15, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(studentService.getStudents(search, className, grade, status, pageable)));
    }

    @GetMapping("/next-code")
    @PreAuthorize("hasAuthority('student.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('TEACHER')")
    @Operation(summary = "Get next unique auto-generated student code")
    public ResponseEntity<ApiResponse<java.util.Map<String, String>>> getNextStudentCode() {
        return ResponseEntity.ok(ApiResponse.ok(java.util.Map.of("nextCode", studentService.getNextStudentCode())));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('student.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('TEACHER')")
    @Operation(summary = "Get student by ID")
    public ResponseEntity<ApiResponse<StudentDto>> getStudentById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(studentService.getStudentById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('student.create') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Register new student")
    public ResponseEntity<ApiResponse<StudentDto>> createStudent(@Valid @RequestBody CreateStudentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Student registered successfully", studentService.createStudent(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('student.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Update student details")
    public ResponseEntity<ApiResponse<StudentDto>> updateStudent(
            @PathVariable Long id,
            @Valid @RequestBody CreateStudentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Student updated successfully", studentService.updateStudent(id, request)));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAuthority('student.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Update student active or inactive status")
    public ResponseEntity<ApiResponse<StudentDto>> updateStudentStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        return ResponseEntity.ok(ApiResponse.ok("Student status updated successfully", studentService.updateStudentStatus(id, status)));
    }

    @PostMapping("/promote")
    @PreAuthorize("hasAuthority('student.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Batch promote students up a grade or full new year school roll-over")
    public ResponseEntity<ApiResponse<PromoteStudentsResult>> promoteStudents(@RequestBody PromoteStudentsRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Students promoted successfully", studentService.promoteStudents(request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('student.delete') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Withdraw student")
    public ResponseEntity<ApiResponse<Void>> deleteStudent(@PathVariable Long id) {
        studentService.deleteStudent(id);
        return ResponseEntity.ok(ApiResponse.ok("Student withdrawn successfully", null));
    }
}

