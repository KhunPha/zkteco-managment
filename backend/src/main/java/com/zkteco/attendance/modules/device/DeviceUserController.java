package com.zkteco.attendance.modules.device;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.common.PageResponse;
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

@RestController
@RequestMapping("/api/v1/device-users")
@RequiredArgsConstructor
@Tag(name = "Device User Synchronization", description = "Mapping terminal biometric PINs to employees and students")
public class DeviceUserController {

    private final DeviceService deviceService;

    @GetMapping
    @PreAuthorize("hasAuthority('device.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get paginated device users with filtering")
    public ResponseEntity<ApiResponse<PageResponse<DeviceUserDto>>> getDeviceUsers(
            @RequestParam(required = false) Long deviceId,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 15, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(deviceService.getDeviceUsers(deviceId, search, pageable)));
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
}

