package com.zkteco.attendance.modules.personnel;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.common.PageResponse;
import com.zkteco.attendance.modules.personnel.dto.CreateEmployeeRequest;
import com.zkteco.attendance.modules.personnel.dto.EmployeeDto;
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
@RequestMapping("/api/v1/teachers")
@RequiredArgsConstructor
@Tag(name = "Teacher Management", description = "Dedicated faculty, lecturers, and teaching staff operations")
public class TeacherController {

    private final EmployeeService employeeService;

    @GetMapping
    @PreAuthorize("hasAuthority('employee.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Get paginated teachers list with filtering")
    public ResponseEntity<ApiResponse<PageResponse<EmployeeDto>>> getTeachers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 25, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(
                employeeService.getEmployees(search, departmentId, branchId, status, "TEACHER", true, pageable)
        ));
    }

    @GetMapping("/next-code")
    @PreAuthorize("hasAuthority('employee.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Get next unique auto-generated teacher/faculty code")
    public ResponseEntity<ApiResponse<java.util.Map<String, String>>> getNextTeacherCode() {
        return ResponseEntity.ok(ApiResponse.ok(java.util.Map.of("nextCode", employeeService.getNextEmployeeCode())));
    }

    @GetMapping("/next-id-number")
    @PreAuthorize("hasAuthority('employee.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Get next unique auto-generated teacher institutional ID (e.g. FBIST260001)")
    public ResponseEntity<ApiResponse<java.util.Map<String, String>>> getNextTeacherIdNumber(@RequestParam(required = false) String year) {
        String nextId = employeeService.getNextEmployeeIdNumber("TEACHER", year);
        return ResponseEntity.ok(ApiResponse.ok(java.util.Map.of("nextIdNumber", nextId)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('employee.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Get teacher details by ID")
    public ResponseEntity<ApiResponse<EmployeeDto>> getTeacherById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(employeeService.getEmployeeById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('employee.create') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Register new teacher/faculty member")
    public ResponseEntity<ApiResponse<EmployeeDto>> createTeacher(@Valid @RequestBody CreateEmployeeRequest request) {
        request.setStaffType("TEACHER");
        request.setIsTeacher(true);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Teacher created successfully", employeeService.createEmployee(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('employee.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Update teacher information")
    public ResponseEntity<ApiResponse<EmployeeDto>> updateTeacher(
            @PathVariable Long id,
            @Valid @RequestBody CreateEmployeeRequest request) {
        request.setStaffType("TEACHER");
        request.setIsTeacher(true);
        return ResponseEntity.ok(ApiResponse.ok("Teacher updated successfully", employeeService.updateEmployee(id, request)));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAuthority('employee.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Update teacher active or inactive status")
    public ResponseEntity<ApiResponse<EmployeeDto>> updateTeacherStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        return ResponseEntity.ok(ApiResponse.ok("Teacher status updated successfully", employeeService.updateEmployeeStatus(id, status)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('employee.delete') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Delete / deactivate teacher")
    public ResponseEntity<ApiResponse<Void>> deleteTeacher(@PathVariable Long id) {
        employeeService.deleteEmployee(id);
        return ResponseEntity.ok(ApiResponse.ok("Teacher deactivated successfully", null));
    }
}

