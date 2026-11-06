package com.zkteco.attendance.modules.leave;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.modules.leave.dto.CreateHolidayRequest;
import com.zkteco.attendance.modules.leave.dto.HolidayDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/holidays")
@RequiredArgsConstructor
@Tag(name = "Holiday Management", description = "Public, institutional, and academic holiday calendar")
public class HolidayController {

    private final HolidayService holidayService;

    @GetMapping
    @PreAuthorize("hasAuthority('holiday.read') or hasRole('EMPLOYEE') or hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Get list of all official holidays")
    public ResponseEntity<ApiResponse<List<HolidayDto>>> getHolidays() {
        return ResponseEntity.ok(ApiResponse.ok(holidayService.getAllHolidays()));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('holiday.create') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Register a calendar holiday or date range")
    public ResponseEntity<ApiResponse<HolidayDto>> createHoliday(@Valid @RequestBody CreateHolidayRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Holiday registered", holidayService.createHoliday(request)));
    }

    @PostMapping("/seed-cambodia")
    @PreAuthorize("hasAuthority('holiday.create') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Seed Cambodian official public holidays for current or specified year")
    public ResponseEntity<ApiResponse<List<HolidayDto>>> seedCambodianHolidays(@RequestParam(required = false) Integer year) {
        int targetYear = year != null ? year : LocalDate.now().getYear();
        List<HolidayDto> seeded = holidayService.seedCambodianHolidays(targetYear);
        return ResponseEntity.ok(ApiResponse.ok("Cambodian official public holidays populated for " + targetYear, seeded));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('holiday.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Remove a calendar holiday")
    public ResponseEntity<ApiResponse<Void>> deleteHoliday(@PathVariable Long id) {
        holidayService.deleteHoliday(id);
        return ResponseEntity.ok(ApiResponse.ok("Holiday removed", null));
    }
}
