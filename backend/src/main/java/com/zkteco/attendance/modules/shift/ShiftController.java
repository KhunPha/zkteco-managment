package com.zkteco.attendance.modules.shift;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.modules.shift.dto.CreateShiftRequest;
import com.zkteco.attendance.modules.shift.dto.ShiftDto;
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
@RequestMapping("/api/v1/shifts")
@RequiredArgsConstructor
@Tag(name = "Shift Management", description = "Work shifts, break schedules, and overtime rules")
public class ShiftController {

    private final ShiftService shiftService;

    @GetMapping
    @PreAuthorize("hasAuthority('shift.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Get all configured work shifts")
    public ResponseEntity<ApiResponse<List<ShiftDto>>> getAllShifts() {
        return ResponseEntity.ok(ApiResponse.ok(shiftService.getAllShifts()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('shift.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Get shift details by ID")
    public ResponseEntity<ApiResponse<ShiftDto>> getShiftById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(shiftService.getShiftById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('shift.create') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Create a new work shift")
    public ResponseEntity<ApiResponse<ShiftDto>> createShift(@Valid @RequestBody CreateShiftRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Shift created successfully", shiftService.createShift(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('shift.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Update an existing work shift")
    public ResponseEntity<ApiResponse<ShiftDto>> updateShift(
            @PathVariable Long id,
            @Valid @RequestBody CreateShiftRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Shift updated successfully", shiftService.updateShift(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('shift.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Delete shift")
    public ResponseEntity<ApiResponse<Void>> deleteShift(@PathVariable Long id) {
        shiftService.deleteShift(id);
        return ResponseEntity.ok(ApiResponse.ok("Shift deleted successfully", null));
    }
}

