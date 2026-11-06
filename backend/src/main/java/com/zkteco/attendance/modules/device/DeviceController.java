package com.zkteco.attendance.modules.device;

import com.fasterxml.jackson.databind.JsonNode;
import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.common.PageResponse;
import com.zkteco.attendance.modules.device.dto.*;
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
import java.util.Map;

@RestController
@RequestMapping("/api/v1/devices")
@RequiredArgsConstructor
@Tag(name = "Device Management", description = "Biometric terminals registration, status monitoring, and hardware triggers")
public class DeviceController {

    private final DeviceService deviceService;

    @GetMapping
    @PreAuthorize("hasAuthority('device.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get registered devices with filtering")
    public ResponseEntity<ApiResponse<PageResponse<DeviceDto>>> getDevices(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 15, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(deviceService.getDevices(search, status, pageable)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('device.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get device details by ID")
    public ResponseEntity<ApiResponse<DeviceDto>> getDeviceById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(deviceService.getDeviceById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('device.create') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Register new biometric terminal")
    public ResponseEntity<ApiResponse<DeviceDto>> createDevice(@Valid @RequestBody CreateDeviceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Device registered successfully", deviceService.createDevice(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('device.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Update device configuration")
    public ResponseEntity<ApiResponse<DeviceDto>> updateDevice(
            @PathVariable Long id,
            @Valid @RequestBody CreateDeviceRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Device updated successfully", deviceService.updateDevice(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('device.delete') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Remove registered device")
    public ResponseEntity<ApiResponse<Void>> deleteDevice(@PathVariable Long id) {
        deviceService.deleteDevice(id);
        return ResponseEntity.ok(ApiResponse.ok("Device removed successfully", null));
    }

    @PostMapping("/{id}/test-connection")
    @PreAuthorize("hasAuthority('device.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Test connectivity with biometric terminal")
    public ResponseEntity<ApiResponse<Boolean>> testConnection(@PathVariable Long id) {
        boolean connected = deviceService.testConnection(id);
        String msg = connected ? "Device reachable and online" : "Failed to connect to device";
        return ResponseEntity.ok(ApiResponse.ok(msg, connected));
    }

    @GetMapping("/{id}/live-status")
    @PreAuthorize("hasAuthority('device.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Query live hardware telemetry, machine clock, drift, and diagnostics")
    public ResponseEntity<ApiResponse<DeviceLiveStatusDto>> getDeviceLiveStatus(@PathVariable Long id) {
        DeviceLiveStatusDto status = deviceService.getDeviceLiveStatus(id);
        return ResponseEntity.ok(ApiResponse.ok("Live status retrieved", status));
    }

    @PostMapping("/{id}/sync-time")
    @PreAuthorize("hasAuthority('device.sync') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Synchronize device clock with server/computer time")
    public ResponseEntity<ApiResponse<DeviceControlResponseDto>> syncTime(@PathVariable Long id) {
        DeviceControlResponseDto result = deviceService.syncTime(id);
        return ResponseEntity.ok(ApiResponse.ok(result.getMessage(), result));
    }

    @PostMapping("/sync-all-time")
    @PreAuthorize("hasAuthority('device.sync') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Synchronize hardware clocks across all registered terminals simultaneously")
    public ResponseEntity<ApiResponse<List<DeviceControlResponseDto>>> syncAllDevicesTime() {
        List<DeviceControlResponseDto> results = deviceService.syncAllDevicesTime();
        return ResponseEntity.ok(ApiResponse.ok("Synchronized clocks across active terminals", results));
    }

    @PostMapping("/{id}/control")
    @PreAuthorize("hasAuthority('device.restart') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Send hardware command: SYNC_TIME, TEST_VOICE, RESTART, POWER_OFF, DISABLE, ENABLE, CLEAR_LOGS")
    public ResponseEntity<ApiResponse<DeviceControlResponseDto>> controlDevice(
            @PathVariable Long id,
            @Valid @RequestBody DeviceControlRequest request) {
        DeviceControlResponseDto result = deviceService.controlDevice(id, request);
        return ResponseEntity.ok(ApiResponse.ok(result.getMessage(), result));
    }

    @PostMapping("/{id}/pull-logs")
    @PreAuthorize("hasAuthority('device.sync') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Manually download attendance records from device")
    public ResponseEntity<ApiResponse<Integer>> pullAttendanceLogs(@PathVariable Long id) {
        int count = deviceService.pullAttendanceLogs(id);
        return ResponseEntity.ok(ApiResponse.ok("Successfully downloaded " + count + " new attendance logs", count));
    }

    @PostMapping("/{id}/restart")
    @PreAuthorize("hasAuthority('device.restart') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Restart terminal remotely")
    public ResponseEntity<ApiResponse<Boolean>> restartDevice(@PathVariable Long id) {
        boolean rebooted = deviceService.restartDevice(id);
        return ResponseEntity.ok(ApiResponse.ok("Restart command dispatched", rebooted));
    }

    @PostMapping("/{id}/sync-users-to-device")
    @PreAuthorize("hasAuthority('device.sync') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Synchronize users to this biometric terminal")
    public ResponseEntity<ApiResponse<Integer>> syncUsersToDevice(
            @PathVariable Long id,
            @RequestParam(required = false) Long sourceDeviceId) {
        int count = deviceService.syncUsersToDevice(id, sourceDeviceId);
        return ResponseEntity.ok(ApiResponse.ok("Successfully synced " + count + " users to device", count));
    }

    @GetMapping("/{id}/menu-parameters")
    @PreAuthorize("hasAuthority('device.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Query all hardware menu parameters from physical terminal")
    public ResponseEntity<ApiResponse<JsonNode>> getMenuParameters(@PathVariable Long id) {
        JsonNode params = deviceService.getDeviceMenuParameters(id);
        return ResponseEntity.ok(ApiResponse.ok("Menu parameters retrieved from terminal", params));
    }

    @PostMapping("/{id}/menu-parameters")
    @PreAuthorize("hasAuthority('device.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Update hardware menu parameters on physical terminal")
    public ResponseEntity<ApiResponse<JsonNode>> setMenuParameters(
            @PathVariable Long id,
            @RequestBody JsonNode params) {
        JsonNode result = deviceService.setDeviceMenuParameters(id, params);
        return ResponseEntity.ok(ApiResponse.ok("Menu parameters saved to terminal", result));
    }

    @PostMapping("/sync-all-users")
    @PreAuthorize("hasAuthority('device.sync') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Synchronize all personnel accounts across all active biometric terminals")
    public ResponseEntity<ApiResponse<Integer>> syncAllUsersAcrossAllDevices() {
        int total = deviceService.syncAllUsersAcrossAllDevices();
        return ResponseEntity.ok(ApiResponse.ok("Successfully synchronized personnel across all terminals (" + total + " records)", total));
    }

    @PostMapping("/scan-network")
    @PreAuthorize("hasAuthority('device.create') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Auto-discover ZKTeco terminals on local subnet range via parallel socket probing")
    public ResponseEntity<ApiResponse<List<DiscoveredDeviceDto>>> scanNetwork(@RequestBody(required = false) NetworkScanRequest request) {
        if (request == null) request = new NetworkScanRequest();
        List<DiscoveredDeviceDto> discovered = deviceService.scanNetwork(request);
        return ResponseEntity.ok(ApiResponse.ok("Network scan completed: found " + discovered.size() + " terminals", discovered));
    }

    @PostMapping("/ping-all")
    @PreAuthorize("hasAuthority('device.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Ping and refresh health status for all registered biometric terminals in parallel")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> pingAllDevices() {
        List<Map<String, Object>> statuses = deviceService.pingAllDevices();
        long onlineCount = statuses.stream().filter(m -> Boolean.TRUE.equals(m.get("online"))).count();
        return ResponseEntity.ok(ApiResponse.ok("Checked " + statuses.size() + " devices: " + onlineCount + " Online", statuses));
    }

    @PostMapping("/{id}/backup-and-clear-logs")
    @PreAuthorize("hasAuthority('device.sync') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Download all attendance logs from terminal into database and wipe terminal buffer to free memory")
    public ResponseEntity<ApiResponse<Map<String, Object>>> backupAndClearDeviceLogs(@PathVariable Long id) {
        Map<String, Object> result = deviceService.backupAndClearDeviceLogs(id);
        return ResponseEntity.ok(ApiResponse.ok((String) result.get("message"), result));
    }
}

