package com.zkteco.attendance.modules.audit;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.common.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Audit Logging", description = "Immutable audit records for compliance, operations, and forensic analysis")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAuthority('audit.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get system activity audit trail with rich filtering")
    public ResponseEntity<ApiResponse<PageResponse<AuditLog>>> getAuditLogs(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endDate,
            @PageableDefault(size = 20) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.ok(
                auditLogService.getAuditLogs(search, action, entityType, startDate, endDate, pageable)
        ));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('audit.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get audit activity summary metrics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAuditSummary() {
        return ResponseEntity.ok(ApiResponse.ok(auditLogService.getAuditSummary()));
    }
}
