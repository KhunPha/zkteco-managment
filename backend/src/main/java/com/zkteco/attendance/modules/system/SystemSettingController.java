package com.zkteco.attendance.modules.system;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/settings")
@RequiredArgsConstructor
@Tag(name = "System Settings", description = "Global system configuration parameters")
public class SystemSettingController {

    private final SystemSettingService settingService;

    @Data
    public static class SettingUpdateRequest {
        private String value;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('settings.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get all system configuration parameters")
    public ResponseEntity<ApiResponse<List<SystemSetting>>> getSettings() {
        return ResponseEntity.ok(ApiResponse.ok(settingService.getAllSettings()));
    }

    @PutMapping("/{key}")
    @PreAuthorize("hasAuthority('settings.manage') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Update system setting value")
    public ResponseEntity<ApiResponse<SystemSetting>> updateSetting(
            @PathVariable String key,
            @RequestBody SettingUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        String username = (principal != null) ? principal.getUsername() : "ADMIN";
        return ResponseEntity.ok(ApiResponse.ok("Setting updated", settingService.updateSetting(key, request.getValue(), username)));
    }
}

