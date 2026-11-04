package com.zkteco.attendance.modules.device;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.common.PageResponse;
import com.zkteco.attendance.modules.device.dto.CreateDeviceRequest;
import com.zkteco.attendance.modules.device.dto.DeviceDto;
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

    @PostMapping("/{id}/sync-time")
    @PreAuthorize("hasAuthority('device.sync') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Synchronize device clock with server time")
    public ResponseEntity<ApiResponse<Boolean>> syncTime(@PathVariable Long id) {
        boolean synced = deviceService.syncTime(id);
        return ResponseEntity.ok(ApiResponse.ok("Time synchronization command sent", synced));
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

    @PostMapping("/sync-all-users")
    @PreAuthorize("hasAuthority('device.sync') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Synchronize all personnel accounts across all active biometric terminals")
    public ResponseEntity<ApiResponse<Integer>> syncAllUsersAcrossAllDevices() {
        int total = deviceService.syncAllUsersAcrossAllDevices();
        return ResponseEntity.ok(ApiResponse.ok("Successfully synchronized personnel across all terminals (" + total + " records)", total));
    }
}

