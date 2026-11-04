package com.zkteco.attendance.modules.leave;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.common.PageResponse;
import com.zkteco.attendance.modules.leave.dto.*;
import com.zkteco.attendance.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/leaves")
@RequiredArgsConstructor
@Tag(name = "Leave Management", description = "Leave categories, balances, employee leave requests, and approval workflow")
public class LeaveController {

    private final LeaveService leaveService;

    @GetMapping("/types")
    @PreAuthorize("hasAuthority('leave.read') or hasRole('EMPLOYEE') or hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Get all active leave types")
    public ResponseEntity<ApiResponse<List<LeaveTypeDto>>> getLeaveTypes() {
        return ResponseEntity.ok(ApiResponse.ok(leaveService.getAllLeaveTypes()));
    }

    @PostMapping("/types")
    @PreAuthorize("hasAuthority('settings.manage') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Create a new leave type")
    public ResponseEntity<ApiResponse<LeaveTypeDto>> createLeaveType(@Valid @RequestBody CreateLeaveTypeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Leave type created", leaveService.createLeaveType(request)));
    }

    @GetMapping("/requests")
    @PreAuthorize("hasAuthority('leave.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Get paginated leave applications")
    public ResponseEntity<ApiResponse<PageResponse<LeaveRequestDto>>> getLeaveRequests(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 15) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(leaveService.getLeaveRequests(status, pageable)));
    }

    @PostMapping("/requests")
    @PreAuthorize("hasAuthority('leave.apply') or hasRole('EMPLOYEE') or hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Submit a leave application")
    public ResponseEntity<ApiResponse<LeaveRequestDto>> submitLeaveRequest(@Valid @RequestBody CreateLeaveRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Leave application submitted", leaveService.submitLeaveRequest(request)));
    }

    @PostMapping("/requests/{id}/review")
    @PreAuthorize("hasAuthority('leave.approve') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Approve or reject a leave application")
    public ResponseEntity<ApiResponse<LeaveRequestDto>> reviewLeaveRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ApproveLeaveRequest request) {
        Long approverId = (principal != null) ? principal.getId() : null;
        return ResponseEntity.ok(ApiResponse.ok("Leave decision recorded", leaveService.approveLeave(id, approverId, request)));
    }
}

