package com.zkteco.attendance.modules.shift;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.modules.shift.dto.AssignScheduleRequest;
import com.zkteco.attendance.modules.shift.dto.BatchAssignScheduleRequest;
import com.zkteco.attendance.modules.shift.dto.ScheduleDto;
import com.zkteco.attendance.modules.shift.dto.UnassignedScheduleSummaryDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/schedules")
@RequiredArgsConstructor
@Tag(name = "Schedule Management", description = "Personnel shift rosters and recurring schedules")
public class ScheduleController {

    private final ScheduleService scheduleService;

    @GetMapping
    @PreAuthorize("hasAuthority('schedule.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Get all schedule assignments")
    public ResponseEntity<ApiResponse<List<ScheduleDto>>> getAllSchedules() {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.getAllSchedules()));
    }

    @GetMapping("/unassigned-summary")
    @PreAuthorize("hasAuthority('schedule.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Get summary of personnel without an assigned schedule")
    public ResponseEntity<ApiResponse<UnassignedScheduleSummaryDto>> getUnassignedSummary() {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.getUnassignedSummary()));
    }

    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAuthority('schedule.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Get schedules for specific employee")
    public ResponseEntity<ApiResponse<List<ScheduleDto>>> getEmployeeSchedules(@PathVariable Long employeeId) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.getSchedulesByEmployee(employeeId)));
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAuthority('schedule.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Get schedules for specific student")
    public ResponseEntity<ApiResponse<List<ScheduleDto>>> getStudentSchedules(@PathVariable Long studentId) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.getSchedulesByStudent(studentId)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('schedule.create') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Assign shift schedule to employee or student")
    public ResponseEntity<ApiResponse<ScheduleDto>> assignSchedule(@Valid @RequestBody AssignScheduleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Schedule assigned successfully", scheduleService.assignSchedule(request)));
    }

    @PostMapping("/batch")
    @PreAuthorize("hasAuthority('schedule.create') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Batch assign shift schedule to employees, teachers, or students")
    public ResponseEntity<ApiResponse<List<ScheduleDto>>> assignBatchSchedule(@Valid @RequestBody BatchAssignScheduleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Schedules assigned successfully", scheduleService.assignBatchSchedule(request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('schedule.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Remove schedule assignment")
    public ResponseEntity<ApiResponse<Void>> deleteSchedule(@PathVariable Long id) {
        scheduleService.deleteSchedule(id);
        return ResponseEntity.ok(ApiResponse.ok("Schedule removed successfully", null));
    }

    @DeleteMapping("/employee/{employeeId}")
    @PreAuthorize("hasAuthority('schedule.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Remove all schedules for employee")
    public ResponseEntity<ApiResponse<Void>> deleteEmployeeSchedules(@PathVariable Long employeeId) {
        scheduleService.deleteScheduleByEmployee(employeeId);
        return ResponseEntity.ok(ApiResponse.ok("Employee schedules removed successfully", null));
    }

    @DeleteMapping("/student/{studentId}")
    @PreAuthorize("hasAuthority('schedule.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Remove all schedules for student")
    public ResponseEntity<ApiResponse<Void>> deleteStudentSchedules(@PathVariable Long studentId) {
        scheduleService.deleteScheduleByStudent(studentId);
        return ResponseEntity.ok(ApiResponse.ok("Student schedules removed successfully", null));
    }
}
