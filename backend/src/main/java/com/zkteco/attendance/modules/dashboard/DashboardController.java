package com.zkteco.attendance.modules.dashboard;

import com.zkteco.attendance.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard & Analytics", description = "Real-time attendance summaries, online devices, and trend analytics")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('attendance.read') or hasRole('EMPLOYEE') or hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Get executive dashboard live statistics")
    public ResponseEntity<ApiResponse<DashboardSummaryDto>> getDashboardSummary() {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getSummary()));
    }
}

