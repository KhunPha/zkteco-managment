package com.zkteco.attendance.modules.organization;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.modules.organization.dto.CreatePositionRequest;
import com.zkteco.attendance.modules.organization.dto.PositionDto;
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
@RequestMapping("/api/v1/positions")
@RequiredArgsConstructor
@Tag(name = "Position Management", description = "Job titles and roles")
public class PositionController {

    private final OrganizationService organizationService;

    @GetMapping
    @PreAuthorize("hasAuthority('department.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get all positions")
    public ResponseEntity<ApiResponse<List<PositionDto>>> getAllPositions() {
        return ResponseEntity.ok(ApiResponse.ok(organizationService.getAllPositions()));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('department.create') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Create a new position")
    public ResponseEntity<ApiResponse<PositionDto>> createPosition(@Valid @RequestBody CreatePositionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Position created successfully", organizationService.createPosition(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('department.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Update position")
    public ResponseEntity<ApiResponse<PositionDto>> updatePosition(
            @PathVariable Long id,
            @Valid @RequestBody CreatePositionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Position updated successfully", organizationService.updatePosition(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('department.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Delete position")
    public ResponseEntity<ApiResponse<Void>> deletePosition(@PathVariable Long id) {
        organizationService.deletePosition(id);
        return ResponseEntity.ok(ApiResponse.ok("Position deleted successfully", null));
    }
}

