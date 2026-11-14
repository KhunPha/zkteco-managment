package com.zkteco.attendance.modules.backup;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.modules.backup.dto.*;
import com.zkteco.attendance.modules.tenant.TenantContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/backups")
@RequiredArgsConstructor
@Tag(name = "Database Backup & Cloud Sync", description = "Automated PostgreSQL backups and Google Drive integration")
public class BackupController {

    private final BackupService backupService;

    private String resolveCompany() {
        String tenant = TenantContext.resolveEffectiveTenant();
        if (tenant == null || "all".equalsIgnoreCase(tenant) || tenant.isBlank()) {
            return "default";
        }
        return tenant;
    }

    @GetMapping("/config")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get current backup schedule and Google Drive configuration")
    public ResponseEntity<ApiResponse<BackupConfigDto>> getConfig() {
        return ResponseEntity.ok(ApiResponse.ok(backupService.getConfig(resolveCompany())));
    }

    @PutMapping("/config")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Update backup schedule and cloud configuration")
    public ResponseEntity<ApiResponse<BackupConfigDto>> updateConfig(@Valid @RequestBody UpdateBackupConfigRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Backup configuration updated successfully", backupService.updateConfig(resolveCompany(), request)));
    }

    @PostMapping("/test-gdrive")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Test Google Drive credentials and folder write permissions")
    public ResponseEntity<ApiResponse<TestGDriveResponse>> testGoogleDrive(@RequestBody TestGDriveRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(backupService.testGoogleDrive(resolveCompany(), request)));
    }

    @PostMapping("/gdrive/oauth-exchange")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Exchange Google OAuth2 authorization code for refresh token")
    public ResponseEntity<ApiResponse<TestGDriveResponse>> exchangeOAuthCode(@Valid @RequestBody OAuthExchangeRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(backupService.exchangeOAuthCode(resolveCompany(), request)));
    }

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get list of all database backups")
    public ResponseEntity<ApiResponse<List<BackupRecordDto>>> listBackups() {
        return ResponseEntity.ok(ApiResponse.ok(backupService.listBackups(resolveCompany())));
    }

    @PostMapping("/run")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Trigger immediate database backup")
    public ResponseEntity<ApiResponse<BackupRecordDto>> runBackup() {
        BackupRecordDto record = backupService.triggerBackup(resolveCompany(), "MANUAL");
        return ResponseEntity.ok(ApiResponse.ok("Backup process completed", record));
    }

    @GetMapping("/{id}/download")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Download backup .sql.gz archive")
    public ResponseEntity<Resource> downloadBackup(@PathVariable Long id) {
        Resource resource = backupService.getBackupDownloadResource(id, resolveCompany());
        String filename = backupService.getBackupFilename(id);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/gzip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(resource);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Delete backup archive")
    public ResponseEntity<ApiResponse<Void>> deleteBackup(@PathVariable Long id) {
        backupService.deleteBackup(id, resolveCompany());
        return ResponseEntity.ok(ApiResponse.ok("Backup deleted successfully", null));
    }
}

