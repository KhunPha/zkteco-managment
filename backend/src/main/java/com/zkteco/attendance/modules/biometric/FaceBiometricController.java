package com.zkteco.attendance.modules.biometric;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.modules.biometric.dto.FaceDescriptorDto;
import com.zkteco.attendance.modules.biometric.dto.FaceEnrollmentRequest;
import com.zkteco.attendance.modules.biometric.dto.FacePunchRequest;
import com.zkteco.attendance.modules.biometric.dto.FacePunchResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/faces")
@RequiredArgsConstructor
@Tag(name = "Face Biometrics", description = "Webcam Face ID Enrollment & Live Recognition APIs")
public class FaceBiometricController {

    private final FaceBiometricService faceService;
    private final FaceScanLogRepository scanLogRepository;

    @PostMapping("/enroll")
    @PreAuthorize("hasAuthority('device.manage') or hasAuthority('personnel.manage') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Enroll face via Webcam with 128-d descriptor and photo")
    public ResponseEntity<ApiResponse<FaceDescriptorDto>> enrollFace(@Valid @RequestBody FaceEnrollmentRequest request) {
        FaceDescriptorDto dto = faceService.enrollFace(request);
        return ResponseEntity.ok(ApiResponse.ok("Face enrolled successfully", dto));
    }

    @GetMapping("/descriptors")
    @Operation(summary = "Get all enrolled face descriptors for instant client-side matching")
    public ResponseEntity<ApiResponse<List<FaceDescriptorDto>>> getAllDescriptors() {
        List<FaceDescriptorDto> list = faceService.getAllDescriptors();
        return ResponseEntity.ok(ApiResponse.ok("Enrolled face descriptors retrieved", list));
    }

    @PostMapping("/punch")
    @Operation(summary = "Register biometric face attendance punch from Webcam Live Kiosk")
    public ResponseEntity<ApiResponse<FacePunchResponse>> punch(@Valid @RequestBody FacePunchRequest request) {
        FacePunchResponse response = faceService.verifyAndPunch(request);
        return ResponseEntity.ok(ApiResponse.ok("Face attendance punch processed successfully", response));
    }

    @DeleteMapping("/{devicePin}")
    @PreAuthorize("hasAuthority('device.manage') or hasAuthority('personnel.manage') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Delete enrolled face biometric by device pin")
    public ResponseEntity<ApiResponse<Void>> deleteFace(@PathVariable String devicePin) {
        faceService.deleteFace(devicePin);
        return ResponseEntity.ok(ApiResponse.ok("Face biometric deleted successfully", null));
    }

    @GetMapping("/recent-scans")
    @Operation(summary = "Get recent webcam face scans for monitoring")
    public ResponseEntity<ApiResponse<List<FaceScanLog>>> getRecentScans() {
        return ResponseEntity.ok(ApiResponse.ok("Recent scans retrieved", scanLogRepository.findTop20ByOrderByCreatedAtDesc()));
    }
}

