package com.zkteco.attendance.modules.report;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.modules.attendance.dto.AttendanceRecordDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/attendance/reports")
@RequiredArgsConstructor
@Tag(name = "Attendance Reports", description = "Report queries and multi-format exports (Excel, CSV, PDF)")
public class ReportController {

    private final ReportService reportService;
    private final ReportExportService exportService;

    @GetMapping
    @PreAuthorize("hasAuthority('report.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Generate filtered attendance report data")
    public ResponseEntity<ApiResponse<List<AttendanceRecordDto>>> getReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) String status) {

        LocalDate start = (startDate != null) ? startDate : LocalDate.now().minusMonths(1);
        LocalDate end = (endDate != null) ? endDate : LocalDate.now();

        return ResponseEntity.ok(ApiResponse.ok(reportService.getReportRecords(start, end, departmentId, employeeId, status)));
    }

    @GetMapping("/export/excel")
    @PreAuthorize("hasAuthority('report.export') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Export attendance records to Microsoft Excel (.xlsx)")
    public void exportExcel(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) String status,
            HttpServletResponse response) throws Exception {

        LocalDate start = (startDate != null) ? startDate : LocalDate.now().minusMonths(1);
        LocalDate end = (endDate != null) ? endDate : LocalDate.now();

        List<AttendanceRecordDto> records = reportService.getReportRecords(start, end, departmentId, employeeId, status);

        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"attendance-report-" + start + "-to-" + end + ".xlsx\"");
        exportService.exportToExcel(records, response.getOutputStream());
    }

    @GetMapping("/export/csv")
    @PreAuthorize("hasAuthority('report.export') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Export attendance records to CSV")
    public void exportCsv(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) String status,
            HttpServletResponse response) throws Exception {

        LocalDate start = (startDate != null) ? startDate : LocalDate.now().minusMonths(1);
        LocalDate end = (endDate != null) ? endDate : LocalDate.now();

        List<AttendanceRecordDto> records = reportService.getReportRecords(start, end, departmentId, employeeId, status);

        response.setContentType("text/csv");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"attendance-report-" + start + "-to-" + end + ".csv\"");
        exportService.exportToCsv(records, response.getOutputStream());
    }

    @GetMapping("/export/pdf")
    @PreAuthorize("hasAuthority('report.export') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Export attendance records to PDF Document")
    public void exportPdf(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) String status,
            HttpServletResponse response) throws Exception {

        LocalDate start = (startDate != null) ? startDate : LocalDate.now().minusMonths(1);
        LocalDate end = (endDate != null) ? endDate : LocalDate.now();

        List<AttendanceRecordDto> records = reportService.getReportRecords(start, end, departmentId, employeeId, status);

        response.setContentType(MediaType.APPLICATION_PDF_VALUE);
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"attendance-report-" + start + "-to-" + end + ".pdf\"");
        exportService.exportToPdf(records, response.getOutputStream());
    }
}

