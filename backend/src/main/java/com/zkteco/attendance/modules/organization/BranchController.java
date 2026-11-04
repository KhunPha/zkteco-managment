package com.zkteco.attendance.modules.organization;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.modules.organization.dto.BranchDto;
import com.zkteco.attendance.modules.organization.dto.CreateBranchRequest;
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
@RequestMapping("/api/v1/branches")
@RequiredArgsConstructor
@Tag(name = "Branch Management", description = "Organization campuses and branch offices")
public class BranchController {

    private final OrganizationService organizationService;

    @GetMapping
    @PreAuthorize("hasAuthority('branch.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get all branches")
    public ResponseEntity<ApiResponse<List<BranchDto>>> getAllBranches() {
        return ResponseEntity.ok(ApiResponse.ok(organizationService.getAllBranches()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('branch.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get branch by ID")
    public ResponseEntity<ApiResponse<BranchDto>> getBranchById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(organizationService.getBranchById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('branch.create') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Create a new branch")
    public ResponseEntity<ApiResponse<BranchDto>> createBranch(@Valid @RequestBody CreateBranchRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Branch created successfully", organizationService.createBranch(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('branch.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Update an existing branch")
    public ResponseEntity<ApiResponse<BranchDto>> updateBranch(
            @PathVariable Long id,
            @Valid @RequestBody CreateBranchRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Branch updated successfully", organizationService.updateBranch(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('branch.create') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Delete branch")
    public ResponseEntity<ApiResponse<Void>> deleteBranch(@PathVariable Long id) {
        organizationService.deleteBranch(id);
        return ResponseEntity.ok(ApiResponse.ok("Branch deleted successfully", null));
    }
}

