package com.zkteco.attendance.modules.report;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.modules.attendance.dto.AttendanceRecordDto;
import com.zkteco.attendance.modules.report.dto.UserSummaryDto;
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
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) String userCode,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String personnelType,
            @RequestParam(required = false) String orderBy) {

        LocalDate start = (startDate != null) ? startDate : LocalDate.now().minusMonths(1);
        LocalDate end = (endDate != null) ? endDate : LocalDate.now();

        return ResponseEntity.ok(ApiResponse.ok(reportService.getReportRecords(start, end, departmentId, branchId, employeeId, studentId, userCode, status, personnelType, orderBy)));
    }

    @GetMapping("/export/excel")
    @PreAuthorize("hasAuthority('report.export') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Export attendance records to Microsoft Excel (.xlsx)")
    public void exportExcel(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) String userCode,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String personnelType,
            @RequestParam(required = false) String orderBy,
            HttpServletResponse response) throws Exception {

        LocalDate start = (startDate != null) ? startDate : LocalDate.now().minusMonths(1);
        LocalDate end = (endDate != null) ? endDate : LocalDate.now();

        List<AttendanceRecordDto> records = reportService.getReportRecords(start, end, departmentId, branchId, employeeId, studentId, userCode, status, personnelType, orderBy);
        String filename = generateFilename("attendance-report", records, start, end, "xlsx");

        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");
        exportService.exportToExcel(records, response.getOutputStream());
    }

    @GetMapping("/export/csv")
    @PreAuthorize("hasAuthority('report.export') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Export attendance records to CSV")
    public void exportCsv(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) String userCode,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String personnelType,
            @RequestParam(required = false) String orderBy,
            HttpServletResponse response) throws Exception {

        LocalDate start = (startDate != null) ? startDate : LocalDate.now().minusMonths(1);
        LocalDate end = (endDate != null) ? endDate : LocalDate.now();

        List<AttendanceRecordDto> records = reportService.getReportRecords(start, end, departmentId, branchId, employeeId, studentId, userCode, status, personnelType, orderBy);
        String filename = generateFilename("attendance-report", records, start, end, "csv");

        response.setContentType("text/csv");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");
        exportService.exportToCsv(records, response.getOutputStream());
    }

    @GetMapping("/export/pdf")
    @PreAuthorize("hasAuthority('report.export') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Export attendance records to PDF Document")
    public void exportPdf(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) String userCode,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String personnelType,
            @RequestParam(required = false) String orderBy,
            HttpServletResponse response) throws Exception {

        LocalDate start = (startDate != null) ? startDate : LocalDate.now().minusMonths(1);
        LocalDate end = (endDate != null) ? endDate : LocalDate.now();

        List<AttendanceRecordDto> records = reportService.getReportRecords(start, end, departmentId, branchId, employeeId, studentId, userCode, status, personnelType, orderBy);
        String filename = generateFilename("attendance-report", records, start, end, "pdf");

        response.setContentType(MediaType.APPLICATION_PDF_VALUE);
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");
        exportService.exportToPdf(records, response.getOutputStream());
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('report.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Generate per-user attendance summary data matching the Grouped view")
    public ResponseEntity<ApiResponse<List<UserSummaryDto>>> getSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) String userCode,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String personnelType,
            @RequestParam(required = false) String orderBy) {

        LocalDate start = (startDate != null) ? startDate : LocalDate.now().minusMonths(1);
        LocalDate end = (endDate != null) ? endDate : LocalDate.now();

        return ResponseEntity.ok(ApiResponse.ok(reportService.getUserSummaries(start, end, departmentId, branchId, employeeId, studentId, userCode, status, personnelType, orderBy)));
    }

    @GetMapping("/export/summary/excel")
    @PreAuthorize("hasAuthority('report.export') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Export per-user attendance summary to Microsoft Excel (.xlsx)")
    public void exportSummaryExcel(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) String userCode,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String personnelType,
            @RequestParam(required = false) String orderBy,
            HttpServletResponse response) throws Exception {

        LocalDate start = (startDate != null) ? startDate : LocalDate.now().minusMonths(1);
        LocalDate end = (endDate != null) ? endDate : LocalDate.now();

        List<UserSummaryDto> summaries = reportService.getUserSummaries(start, end, departmentId, branchId, employeeId, studentId, userCode, status, personnelType, orderBy);
        String filename = generateSummaryFilename("attendance-summary-report", summaries, personnelType, start, end, "xlsx");

        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");
        exportService.exportSummaryToExcel(summaries, start, end, response.getOutputStream());
    }

    @GetMapping("/export/summary/pdf")
    @PreAuthorize("hasAuthority('report.export') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Export per-user attendance summary to executive PDF")
    public void exportSummaryPdf(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) String userCode,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String personnelType,
            @RequestParam(required = false) String orderBy,
            HttpServletResponse response) throws Exception {

        LocalDate start = (startDate != null) ? startDate : LocalDate.now().minusMonths(1);
        LocalDate end = (endDate != null) ? endDate : LocalDate.now();

        List<UserSummaryDto> summaries = reportService.getUserSummaries(start, end, departmentId, branchId, employeeId, studentId, userCode, status, personnelType, orderBy);
        String filename = generateSummaryFilename("attendance-summary-report", summaries, personnelType, start, end, "pdf");

        response.setContentType(MediaType.APPLICATION_PDF_VALUE);
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");
        exportService.exportSummaryToPdf(summaries, start, end, response.getOutputStream());
    }

    @GetMapping("/export/summary/csv")
    @PreAuthorize("hasAuthority('report.export') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Export per-user attendance summary to CSV")
    public void exportSummaryCsv(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) String userCode,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String personnelType,
            @RequestParam(required = false) String orderBy,
            HttpServletResponse response) throws Exception {

        LocalDate start = (startDate != null) ? startDate : LocalDate.now().minusMonths(1);
        LocalDate end = (endDate != null) ? endDate : LocalDate.now();

        List<UserSummaryDto> summaries = reportService.getUserSummaries(start, end, departmentId, branchId, employeeId, studentId, userCode, status, personnelType, orderBy);
        String filename = generateSummaryFilename("attendance-summary-report", summaries, personnelType, start, end, "csv");

        response.setContentType("text/csv");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");
        exportService.exportSummaryToCsv(summaries, response.getOutputStream());
    }

    private String generateSummaryFilename(String basePrefix, List<UserSummaryDto> summaries, String personnelType, LocalDate start, LocalDate end, String extension) {
        String roleSlug = (personnelType != null && !personnelType.isBlank()) ? "-" + personnelType.toLowerCase() : "";
        if (summaries != null && summaries.size() == 1) {
            UserSummaryDto u = summaries.get(0);
            String name = u.getName() != null ? u.getName().replaceAll("[^a-zA-Z0-9.-]", "_") : "";
            String code = u.getCode() != null ? u.getCode() : "";
            return basePrefix + roleSlug + "-" + name + "-" + code + "-" + start + "-to-" + end + "." + extension;
        }
        return basePrefix + roleSlug + "-" + start + "-to-" + end + "." + extension;
    }

    private String generateFilename(String basePrefix, List<AttendanceRecordDto> records, LocalDate start, LocalDate end, String extension) {
        String userSlug = "";
        if (records != null && !records.isEmpty()) {
            long distinctUsers = records.stream()
                    .map(r -> r.getStudentCode() != null ? r.getStudentCode() : (r.getEmployeeCode() != null ? r.getEmployeeCode() : ""))
                    .filter(s -> !s.isEmpty())
                    .distinct()
                    .count();
            if (distinctUsers == 1) {
                AttendanceRecordDto first = records.get(0);
                String name = first.getStudentName() != null ? first.getStudentName() : first.getEmployeeName();
                String code = first.getStudentCode() != null ? first.getStudentCode() : first.getEmployeeCode();
                if (name != null) {
                    userSlug = "-" + name.trim().replaceAll("[^a-zA-Z0-9.-]", "_");
                }
                if (code != null) {
                    userSlug += "-" + code.trim();
                }
            }
        }
        return basePrefix + userSlug + "-" + start + "-to-" + end + "." + extension;
    }
}

