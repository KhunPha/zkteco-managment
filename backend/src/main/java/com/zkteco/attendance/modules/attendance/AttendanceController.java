package com.zkteco.attendance.modules.attendance;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.common.PageResponse;
import com.zkteco.attendance.modules.attendance.dto.AttendanceRecordDto;
import com.zkteco.attendance.modules.attendance.dto.LiveScanEventDto;
import com.zkteco.attendance.modules.attendance.dto.ManualAttendanceRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
@Tag(name = "Attendance Management", description = "Processed daily attendance records, punches, and manual corrections")
public class AttendanceController {

    private final AttendanceService attendanceService;

    @GetMapping
    @PreAuthorize("hasAuthority('attendance.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Get daily attendance records with filtering")
    public ResponseEntity<ApiResponse<PageResponse<AttendanceRecordDto>>> getAttendanceRecords(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String personnelType,
            @RequestParam(required = false) String orderBy,
            @PageableDefault(size = 20) Pageable pageable) {

        LocalDate targetDate = (date == null && startDate == null) ? LocalDate.now() : date;
        return ResponseEntity.ok(ApiResponse.ok(
                attendanceService.getAttendanceRecords(targetDate, startDate, endDate, departmentId, branchId, status, employeeId, search, personnelType, orderBy, pageable)
        ));
    }

    @GetMapping("/live-scans")
    @PreAuthorize("hasAuthority('attendance.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Get real-time live biometric scan events with resolved student/teacher/employee metadata")
    public ResponseEntity<ApiResponse<List<LiveScanEventDto>>> getLiveScans(
            @RequestParam(defaultValue = "15") int limit) {
        return ResponseEntity.ok(ApiResponse.ok(attendanceService.getLiveScans(limit)));
    }

    @GetMapping("/raw-logs")
    @PreAuthorize("hasAuthority('attendance.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get raw un-tampered terminal event logs")
    public ResponseEntity<ApiResponse<PageResponse<com.zkteco.attendance.modules.attendance.dto.AttendanceRawLogDto>>> getRawLogs(
            @PageableDefault(size = 25) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(attendanceService.getRawLogs(pageable)));
    }

    @PostMapping("/manual")
    @PreAuthorize("hasAuthority('attendance.create') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Create or adjust an attendance record manually")
    public ResponseEntity<ApiResponse<AttendanceRecordDto>> createManualAttendance(
            @Valid @RequestBody ManualAttendanceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Attendance recorded manually", attendanceService.createManualAttendance(request)));
    }

    @PostMapping("/process")
    @PreAuthorize("hasAuthority('attendance.process') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Trigger calculation engine for attendance date")
    public ResponseEntity<ApiResponse<AttendanceProcessingLog>> triggerProcessing(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Attendance calculation completed",
                attendanceService.triggerProcessing(date)
        ));
    }
}

