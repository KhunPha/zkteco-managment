package com.zkteco.attendance.modules.attendance;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.common.PageResponse;
import com.zkteco.attendance.modules.attendance.dto.ApproveCorrectionRequest;
import com.zkteco.attendance.modules.attendance.dto.AttendanceCorrectionDto;
import com.zkteco.attendance.modules.attendance.dto.CreateCorrectionRequest;
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

@RestController
@RequestMapping("/api/v1/attendance/corrections")
@RequiredArgsConstructor
@Tag(name = "Attendance Corrections", description = "Attendance adjustment requests and supervisor approvals")
public class AttendanceCorrectionController {

    private final AttendanceCorrectionService correctionService;

    @GetMapping
    @PreAuthorize("hasAuthority('attendance.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Get list of attendance correction requests")
    public ResponseEntity<ApiResponse<PageResponse<AttendanceCorrectionDto>>> getCorrections(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 15) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(correctionService.getCorrections(status, pageable)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('attendance.create') or hasRole('EMPLOYEE') or hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Submit an attendance correction request")
    public ResponseEntity<ApiResponse<AttendanceCorrectionDto>> submitCorrection(
            @Valid @RequestBody CreateCorrectionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Correction submitted", correctionService.submitCorrection(request)));
    }

    @PostMapping("/{id}/review")
    @PreAuthorize("hasAuthority('attendance.approve') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Approve or reject attendance correction")
    public ResponseEntity<ApiResponse<AttendanceCorrectionDto>> reviewCorrection(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ApproveCorrectionRequest request) {
        Long approverId = (principal != null) ? principal.getId() : null;
        return ResponseEntity.ok(ApiResponse.ok(
                "Correction reviewed",
                correctionService.approveCorrection(id, approverId, request)
        ));
    }
}

