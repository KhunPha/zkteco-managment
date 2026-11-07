package com.zkteco.attendance.modules.device;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.common.PageResponse;
import com.zkteco.attendance.modules.device.dto.CardHistoryDto;
import com.zkteco.attendance.modules.device.dto.ChangeCardRequest;
import com.zkteco.attendance.modules.device.dto.CreateDeviceUserRequest;
import com.zkteco.attendance.modules.device.dto.DeviceUserDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/device-users")
@RequiredArgsConstructor
@Tag(name = "Device User Synchronization", description = "Mapping terminal biometric PINs to employees and students")
public class DeviceUserController {

    private final DeviceService deviceService;
    private final ZkDeviceMasterControlService zkDeviceMasterControlService;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @GetMapping
    @PreAuthorize("hasAuthority('device.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get paginated device users with advanced filtering and natural sorting")
    public ResponseEntity<ApiResponse<PageResponse<DeviceUserDto>>> getDeviceUsers(
            @RequestParam(required = false) Long deviceId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String biometricFilter,
            @RequestParam(required = false) String personnelType,
            @RequestParam(required = false) String sortBy,
            @PageableDefault(size = 15) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(
                deviceService.getDeviceUsers(deviceId, search, status, biometricFilter, personnelType, sortBy, pageable)
        ));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAuthority('device.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Update device user active or inactive status")
    public ResponseEntity<ApiResponse<DeviceUserDto>> updateDeviceUserStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        return ResponseEntity.ok(ApiResponse.ok("Device user status updated", deviceService.updateDeviceUserStatus(id, status)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('device.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Register device PIN mapping to employee or student")
    public ResponseEntity<ApiResponse<DeviceUserDto>> createDeviceUser(@Valid @RequestBody CreateDeviceUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Device user mapped successfully", deviceService.createDeviceUser(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('device.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Update device user mapping")
    public ResponseEntity<ApiResponse<DeviceUserDto>> updateDeviceUser(
            @PathVariable Long id,
            @Valid @RequestBody CreateDeviceUserRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Device user updated successfully", deviceService.updateDeviceUser(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('device.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Delete device user mapping")
    public ResponseEntity<ApiResponse<Void>> deleteDeviceUser(@PathVariable Long id) {
        deviceService.deleteDeviceUser(id);
        return ResponseEntity.ok(ApiResponse.ok("Device user unmapped successfully", null));
    }

    @DeleteMapping("/clear-all")
    @PreAuthorize("hasAuthority('device.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Clear all device user mappings (unmap all personnel)")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> clearAllMappedUsers(
            @RequestParam(required = false) Long targetDeviceId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "All device user mappings cleared successfully",
                deviceService.clearAllMappedUsers(targetDeviceId)
        ));
    }

    @PostMapping("/auto-map-all")
    @PreAuthorize("hasAuthority('device.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Batch auto-map all active employees and students to device users across all active terminals")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> autoMapAllPersonnel(
            @RequestParam(required = false) Long targetDeviceId,
            @RequestParam(defaultValue = "ALL") String personnelType) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Batch device user mapping completed successfully",
                deviceService.autoMapAllPersonnel(targetDeviceId, personnelType)
        ));
    }

    @PostMapping("/sync-from-device/{deviceId}")
    @PreAuthorize("hasAuthority('device.sync') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Read user accounts from terminal and create local mappings")
    public ResponseEntity<ApiResponse<Integer>> syncUsersFromDevice(@PathVariable Long deviceId) {
        int count = deviceService.syncUsersFromTerminal(deviceId);
        return ResponseEntity.ok(ApiResponse.ok("Synced " + count + " users from device", count));
    }

    @PostMapping("/sync-to-device/{targetDeviceId}")
    @PreAuthorize("hasAuthority('device.sync') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Push all device users to target biometric terminal")
    public ResponseEntity<ApiResponse<Integer>> syncUsersToDevice(
            @PathVariable Long targetDeviceId,
            @RequestParam(required = false) Long sourceDeviceId) {
        int count = deviceService.syncUsersToDevice(targetDeviceId, sourceDeviceId);
        return ResponseEntity.ok(ApiResponse.ok("Synced " + count + " users to target device", count));
    }

    @PostMapping("/{id}/enroll-biometrics")
    @PreAuthorize("hasAuthority('device.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Update biometric enrollment (fingerprints, face ID, RFID card)")
    public ResponseEntity<ApiResponse<DeviceUserDto>> enrollBiometrics(
            @PathVariable Long id,
            @RequestParam(required = false) Boolean faceEnrolled,
            @RequestParam(required = false) Integer fingerprintCount,
            @RequestParam(required = false) String cardNumber) {
        DeviceUserDto dto = deviceService.enrollBiometrics(id, faceEnrolled, fingerprintCount, cardNumber);
        return ResponseEntity.ok(ApiResponse.ok("Biometrics updated and queued to terminal", dto));
    }

    @PostMapping("/{id}/change-card")
    @PreAuthorize("hasAuthority('device.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Change RFID Card Number (Annual renewal, re-issue, replacement) and preserve old card in history")
    public ResponseEntity<ApiResponse<DeviceUserDto>> changeCardNumber(
            @PathVariable Long id,
            @Valid @RequestBody ChangeCardRequest request) {
        DeviceUserDto dto = deviceService.changeCardNumber(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Card number updated successfully and previous card preserved in history", dto));
    }

    @GetMapping("/{id}/card-history")
    @PreAuthorize("hasAuthority('device.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get historical card numbers for a device user")
    public ResponseEntity<ApiResponse<List<CardHistoryDto>>> getCardHistory(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(deviceService.getCardHistory(id)));
    }

    @GetMapping("/pin/{pin}/card-history")
    @PreAuthorize("hasAuthority('device.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get historical card numbers by device PIN")
    public ResponseEntity<ApiResponse<List<CardHistoryDto>>> getCardHistoryByPin(@PathVariable String pin) {
        return ResponseEntity.ok(ApiResponse.ok(deviceService.getCardHistoryByPin(pin)));
    }

    @GetMapping("/card-history")
    @PreAuthorize("hasAuthority('device.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get all card history audit logs across the institution")
    public ResponseEntity<ApiResponse<PageResponse<CardHistoryDto>>> getAllCardHistory(
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(deviceService.getAllCardHistory(search, pageable)));
    }

    @PostMapping("/sync-all-fingerprints")
    @PreAuthorize("hasAuthority('device.sync') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Cross-terminal biometric fingerprint synchronization across all machines without ZKTime")
    public ResponseEntity<ApiResponse<com.fasterxml.jackson.databind.JsonNode>> syncAllFingerprints() {
        return ResponseEntity.ok(ApiResponse.ok(
                "Cross-terminal fingerprint synchronization completed",
                zkDeviceMasterControlService.syncAllFingerprints()
        ));
    }

    @PostMapping("/clear-all-fingerprints")
    @PreAuthorize("hasAuthority('device.sync') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Clear all fingerprint biometric templates from all physical terminals and database to avoid duplicates")
    public ResponseEntity<ApiResponse<com.fasterxml.jackson.databind.JsonNode>> clearAllFingerprints() {
        return ResponseEntity.ok(ApiResponse.ok(
                "All device fingerprint data cleared successfully",
                zkDeviceMasterControlService.clearAllFingerprints()
        ));
    }

    @PostMapping("/clear-all-faces")
    @PreAuthorize("hasAuthority('device.sync') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Clear all face biometrics from database and reset user profiles")
    public ResponseEntity<ApiResponse<com.fasterxml.jackson.databind.JsonNode>> clearAllFaces() {
        return ResponseEntity.ok(ApiResponse.ok(
                "All face biometrics cleared successfully",
                zkDeviceMasterControlService.clearAllFaces()
        ));
    }

    @PostMapping("/clear-all-biometrics")
    @PreAuthorize("hasAuthority('device.sync') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Deep wipe: clears both physical machine fingerprints and face recognition biometrics")
    public ResponseEntity<ApiResponse<com.fasterxml.jackson.databind.JsonNode>> clearAllBiometrics() {
        return ResponseEntity.ok(ApiResponse.ok(
                "All biometric data wiped from machines and database",
                zkDeviceMasterControlService.clearAllBiometrics()
        ));
    }

    @PostMapping("/enroll-fingerprint")
    @PreAuthorize("hasAuthority('device.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Remote machine fingerprint enrollment: prompts user 3 times on physical terminal and syncs to all gates")
    public ResponseEntity<ApiResponse<com.fasterxml.jackson.databind.JsonNode>> enrollRemoteFingerprint(
            @RequestParam String pin,
            @RequestParam(defaultValue = "0") int fingerIndex,
            @RequestParam(defaultValue = "192.168.1.202") String targetIp) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Biometric fingerprint enrollment process executed",
                zkDeviceMasterControlService.enrollRemoteFingerprint(targetIp, pin, fingerIndex)
        ));
    }

    @GetMapping("/pin/{pin}/fingerprints")
    @PreAuthorize("hasAuthority('device.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get enrolled fingerprint templates for user PIN")
    public ResponseEntity<ApiResponse<List<java.util.Map<String, Object>>>> getEnrolledFingerprints(@PathVariable String pin) {
        String sql = """
            SELECT finger_index, template_size, valid, updated_at
            FROM attendance_biometric_templates
            WHERE device_pin = ?
            ORDER BY finger_index ASC;
        """;
        List<java.util.Map<String, Object>> rows = jdbcTemplate.query(sql, (rs, rowNum) -> java.util.Map.of(
                "fingerIndex", rs.getInt("finger_index"),
                "size", rs.getInt("template_size"),
                "valid", rs.getInt("valid"),
                "updatedAt", String.valueOf(rs.getTimestamp("updated_at"))
        ), pin);
        return ResponseEntity.ok(ApiResponse.ok(rows));
    }
}

