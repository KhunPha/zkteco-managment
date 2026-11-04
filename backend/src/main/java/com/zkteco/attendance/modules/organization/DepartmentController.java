package com.zkteco.attendance.modules.organization;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.modules.organization.dto.CreateDepartmentRequest;
import com.zkteco.attendance.modules.organization.dto.DepartmentDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/departments")
@RequiredArgsConstructor
@Tag(name = "Department Management", description = "Departments and organizational units")
public class DepartmentController {

    private final OrganizationService organizationService;

    @GetMapping
    @PreAuthorize("hasAuthority('department.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get all departments")
    public ResponseEntity<ApiResponse<List<DepartmentDto>>> getAllDepartments() {
        return ResponseEntity.ok(ApiResponse.ok(organizationService.getAllDepartments()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('department.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get department by ID")
    public ResponseEntity<ApiResponse<DepartmentDto>> getDepartmentById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(organizationService.getDepartmentById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('department.create') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Create a new department")
    public ResponseEntity<ApiResponse<DepartmentDto>> createDepartment(@Valid @RequestBody CreateDepartmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Department created successfully", organizationService.createDepartment(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('department.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Update an existing department")
    public ResponseEntity<ApiResponse<DepartmentDto>> updateDepartment(
            @PathVariable Long id,
            @Valid @RequestBody CreateDepartmentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Department updated successfully", organizationService.updateDepartment(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('department.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Delete department")
    public ResponseEntity<ApiResponse<Void>> deleteDepartment(@PathVariable Long id) {
        organizationService.deleteDepartment(id);
        return ResponseEntity.ok(ApiResponse.ok("Department deleted successfully", null));
    }
}

