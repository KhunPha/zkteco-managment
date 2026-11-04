package com.zkteco.attendance.modules.audit;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.common.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Audit Logging", description = "Immutable audit records for compliance and forensic analysis")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAuthority('audit.read') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Get system activity audit trail")
    public ResponseEntity<ApiResponse<PageResponse<AuditLog>>> getAuditLogs(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(auditLogService.getAuditLogs(pageable)));
    }
}

