package com.zkteco.attendance.modules.shift;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.modules.shift.dto.AssignScheduleRequest;
import com.zkteco.attendance.modules.shift.dto.BatchAssignScheduleRequest;
import com.zkteco.attendance.modules.shift.dto.ScheduleDto;
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
@Tag(name = "Schedule Management", description = "Employee shift rosters and recurring schedules")
public class ScheduleController {

    private final ScheduleService scheduleService;

    @GetMapping
    @PreAuthorize("hasAuthority('schedule.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Get all schedule assignments")
    public ResponseEntity<ApiResponse<List<ScheduleDto>>> getAllSchedules() {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.getAllSchedules()));
    }

    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAuthority('schedule.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Get schedules for specific employee")
    public ResponseEntity<ApiResponse<List<ScheduleDto>>> getEmployeeSchedules(@PathVariable Long employeeId) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.getSchedulesByEmployee(employeeId)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('schedule.create') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Assign shift schedule to employee")
    public ResponseEntity<ApiResponse<ScheduleDto>> assignSchedule(@Valid @RequestBody AssignScheduleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Schedule assigned successfully", scheduleService.assignSchedule(request)));
    }

    @PostMapping("/batch")
    @PreAuthorize("hasAuthority('schedule.create') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Batch assign shift schedule to employees or whole groups/departments")
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
}

