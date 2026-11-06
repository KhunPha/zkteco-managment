package com.zkteco.attendance.modules.dataimport;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.modules.dataimport.dto.DataImportStatusDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/data-import")
@RequiredArgsConstructor
@Tag(name = "Data Import & Role Checker", description = "ZKTeco JSON backup inspection, role verification and dataset import")
public class DataImportController {

    private final DataImportService dataImportService;

    @GetMapping("/status")
    @PreAuthorize("hasAuthority('device.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get database import statistics, user role breakdown, and available backups")
    public ResponseEntity<ApiResponse<DataImportStatusDto>> getImportStatus() {
        return ResponseEntity.ok(ApiResponse.ok(dataImportService.getImportStatus()));
    }

    @PostMapping("/preview")
    @PreAuthorize("hasAuthority('device.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Inspect uploaded ZKTeco JSON backup and preview role distribution")
    public ResponseEntity<ApiResponse<Map<String, Object>>> previewJson(
            @RequestParam("file") MultipartFile file) {
        try {
            String content = new String(file.getBytes(), StandardCharsets.UTF_8);
            return ResponseEntity.ok(ApiResponse.ok("Backup preview generated", dataImportService.previewJsonData(content)));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error("IMPORT_ERROR", "Failed to parse file: " + ex.getMessage()));
        }
    }
}
