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
@RequestMapping("/api/v1/employees")
@RequiredArgsConstructor
@Tag(name = "Employee Management", description = "Staff, teachers, and personnel operations")
public class EmployeeController {

    private final EmployeeService employeeService;

    @GetMapping
    @PreAuthorize("hasAuthority('employee.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Get paginated employees list with filtering")
    public ResponseEntity<ApiResponse<PageResponse<EmployeeDto>>> getEmployees(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 15, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(employeeService.getEmployees(search, departmentId, branchId, status, pageable)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('employee.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Get employee details by ID")
    public ResponseEntity<ApiResponse<EmployeeDto>> getEmployeeById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(employeeService.getEmployeeById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('employee.create') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Register new employee")
    public ResponseEntity<ApiResponse<EmployeeDto>> createEmployee(@Valid @RequestBody CreateEmployeeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Employee created successfully", employeeService.createEmployee(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('employee.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Update employee information")
    public ResponseEntity<ApiResponse<EmployeeDto>> updateEmployee(
            @PathVariable Long id,
            @Valid @RequestBody CreateEmployeeRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Employee updated successfully", employeeService.updateEmployee(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('employee.delete') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Delete / deactivate employee")
    public ResponseEntity<ApiResponse<Void>> deleteEmployee(@PathVariable Long id) {
        employeeService.deleteEmployee(id);
        return ResponseEntity.ok(ApiResponse.ok("Employee deactivated successfully", null));
    }
}

