package com.zkteco.attendance.modules.report;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.zkteco.attendance.common.TimeUtils;
import com.zkteco.attendance.modules.attendance.dto.AttendanceRecordDto;
import com.zkteco.attendance.modules.report.dto.UserSummaryDto;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
public class ReportExportService {

    /**
     * Executive Excel Timesheet Report with 2-Shift Biometric Punches,
     * high-contrast Status Badges, KPI Summary, and Role Identification.
     */
    public void exportToExcel(List<AttendanceRecordDto> records, OutputStream out) throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Attendance Timesheet");
            sheet.setDisplayGridlines(true);

            // Palette definitions (RGB)
            byte[] navyHeaderRgb    = new byte[]{(byte) 15, (byte) 23, (byte) 42};    // Slate 900 #0F172A
            byte[] s1HeaderRgb      = new byte[]{(byte) 180, (byte) 83, (byte) 9};    // Amber 700 #B45309
            byte[] s2HeaderRgb      = new byte[]{(byte) 67, (byte) 56, (byte) 202};   // Indigo 700 #4338CA
            byte[] zebraRgb         = new byte[]{(byte) 248, (byte) 250, (byte) 252}; // Slate 50 #F8FAFC
            byte[] kpiBgRgb         = new byte[]{(byte) 241, (byte) 245, (byte) 249}; // Slate 100 #F1F5F9
            byte[] borderGrayRgb    = new byte[]{(byte) 226, (byte) 232, (byte) 240}; // Slate 200 #E2E8F0

            // Status Badge Colors
            byte[] presentBgRgb     = new byte[]{(byte) 220, (byte) 252, (byte) 231}; // Emerald 100 #DCFCE7
            byte[] presentTextRgb   = new byte[]{(byte) 22, (byte) 101, (byte) 52};   // Emerald 800 #166534

            byte[] lateBgRgb        = new byte[]{(byte) 254, (byte) 243, (byte) 199}; // Amber 100 #FEF3C7
            byte[] lateTextRgb      = new byte[]{(byte) 146, (byte) 64, (byte) 14};   // Amber 800 #92400E

            byte[] absentBgRgb      = new byte[]{(byte) 255, (byte) 228, (byte) 230}; // Rose 100 #FFE4E6
            byte[] absentTextRgb    = new byte[]{(byte) 159, (byte) 18, (byte) 57};   // Rose 800 #9F1239

            byte[] leaveBgRgb       = new byte[]{(byte) 219, (byte) 234, (byte) 254}; // Blue 100 #DBEAFE
            byte[] leaveTextRgb     = new byte[]{(byte) 30, (byte) 64, (byte) 175};   // Blue 800 #1E40AF

            // Role Badge Colors
            byte[] studentBgRgb     = new byte[]{(byte) 224, (byte) 242, (byte) 254}; // Cyan 100 #E0F2FE
            byte[] studentTextRgb   = new byte[]{(byte) 3, (byte) 105, (byte) 161};   // Cyan 700 #0369A1

            byte[] teacherBgRgb     = new byte[]{(byte) 254, (byte) 243, (byte) 199}; // Amber 100 #FEF3C7
            byte[] teacherTextRgb   = new byte[]{(byte) 180, (byte) 83, (byte) 9};    // Amber 700 #B45309

            byte[] staffBgRgb       = new byte[]{(byte) 209, (byte) 250, (byte) 229}; // Emerald 100 #D1FAE5
            byte[] staffTextRgb     = new byte[]{(byte) 4, (byte) 120, (byte) 87};    // Emerald 700 #047857

            // Fonts
            XSSFFont titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 16);
            titleFont.setColor(new XSSFColor(navyHeaderRgb, null));

            XSSFFont metaFont = workbook.createFont();
            metaFont.setFontHeightInPoints((short) 9);
            metaFont.setColor(IndexedColors.GREY_50_PERCENT.getIndex());

            XSSFFont headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 10);
            headerFont.setColor(IndexedColors.WHITE.getIndex());

            XSSFFont regularFont = workbook.createFont();
            regularFont.setFontHeightInPoints((short) 9);

            XSSFFont boldFont = workbook.createFont();
            boldFont.setBold(true);
            boldFont.setFontHeightInPoints((short) 9);

            XSSFFont monoFont = workbook.createFont();
            monoFont.setFontName("Consolas");
            monoFont.setFontHeightInPoints((short) 9);

            // Header Styles
            XSSFCellStyle headerNavyStyle = createHeaderStyle(workbook, headerFont, navyHeaderRgb);
            XSSFCellStyle headerS1Style   = createHeaderStyle(workbook, headerFont, s1HeaderRgb);
            XSSFCellStyle headerS2Style   = createHeaderStyle(workbook, headerFont, s2HeaderRgb);

            // Data Cell Styles
            XSSFCellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setFont(regularFont);
            dataStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBottomBorderColor(new XSSFColor(borderGrayRgb, null));

            XSSFCellStyle dataCenterStyle = workbook.createCellStyle();
            dataCenterStyle.cloneStyleFrom(dataStyle);
            dataCenterStyle.setAlignment(HorizontalAlignment.CENTER);

            XSSFCellStyle dataMonoCenter = workbook.createCellStyle();
            dataMonoCenter.cloneStyleFrom(dataCenterStyle);
            dataMonoCenter.setFont(monoFont);

            XSSFCellStyle dataZebraText = workbook.createCellStyle();
            dataZebraText.cloneStyleFrom(dataStyle);
            dataZebraText.setFillForegroundColor(new XSSFColor(zebraRgb, null));
            dataZebraText.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            XSSFCellStyle dataZebraCenter = workbook.createCellStyle();
            dataZebraCenter.cloneStyleFrom(dataCenterStyle);
            dataZebraCenter.setFillForegroundColor(new XSSFColor(zebraRgb, null));
            dataZebraCenter.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            XSSFCellStyle dataZebraMonoCenter = workbook.createCellStyle();
            dataZebraMonoCenter.cloneStyleFrom(dataMonoCenter);
            dataZebraMonoCenter.setFillForegroundColor(new XSSFColor(zebraRgb, null));
            dataZebraMonoCenter.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // Status Badge Styles
            XSSFCellStyle presentBadge = createBadgeStyle(workbook, regularFont, presentBgRgb, presentTextRgb, borderGrayRgb);
            XSSFCellStyle lateBadge    = createBadgeStyle(workbook, regularFont, lateBgRgb, lateTextRgb, borderGrayRgb);
            XSSFCellStyle absentBadge  = createBadgeStyle(workbook, regularFont, absentBgRgb, absentTextRgb, borderGrayRgb);
            XSSFCellStyle leaveBadge   = createBadgeStyle(workbook, regularFont, leaveBgRgb, leaveTextRgb, borderGrayRgb);

            // Role Badge Styles
            XSSFCellStyle studentRoleBadge = createBadgeStyle(workbook, regularFont, studentBgRgb, studentTextRgb, borderGrayRgb);
            XSSFCellStyle teacherRoleBadge = createBadgeStyle(workbook, regularFont, teacherBgRgb, teacherTextRgb, borderGrayRgb);
            XSSFCellStyle staffRoleBadge   = createBadgeStyle(workbook, regularFont, staffBgRgb, staffTextRgb, borderGrayRgb);

            // KPI calculations
            long totalRecords = records.size();
            long presentCount = records.stream().filter(r -> "PRESENT".equalsIgnoreCase(r.getStatus())).count();
            long lateCount = records.stream().filter(r -> "LATE".equalsIgnoreCase(r.getStatus())).count();
            long absentCount = records.stream().filter(r -> "ABSENT".equalsIgnoreCase(r.getStatus())).count();
            long leaveCount = records.stream().filter(r -> "ON_LEAVE".equalsIgnoreCase(r.getStatus())).count();
            double totalHours = records.stream().mapToInt(AttendanceRecordDto::getTotalWorkMinutes).sum() / 60.0;

            // 1. Report Title Header
            Row titleRow = sheet.createRow(0);
            titleRow.setHeightInPoints(26);
            Cell titleCell = titleRow.createCell(0);

            long distinctUsers = records.stream()
                    .map(this::getDisplayCode)
                    .filter(c -> c != null && !"-".equals(c) && !c.isEmpty())
                    .distinct()
                    .count();

            if (distinctUsers == 1 && !records.isEmpty()) {
                AttendanceRecordDto first = records.get(0);
                titleCell.setCellValue("INDIVIDUAL ATTENDANCE TIMESHEET: " + getDisplayName(first) + " (" + getDisplayCode(first) + ")");
            } else {
                titleCell.setCellValue("ATTENDANCE & TIMESHEET AUDIT REPORT");
            }
            XSSFCellStyle titleStyle = workbook.createCellStyle();
            titleStyle.setFont(titleFont);
            titleCell.setCellStyle(titleStyle);

            Row metaRow = sheet.createRow(1);
            Cell metaCell = metaRow.createCell(0);
            String metaInfo = distinctUsers == 1 && !records.isEmpty()
                    ? ("Role: " + (records.get(0).getPersonnelType() != null ? records.get(0).getPersonnelType() : "STAFF") +
                       " • Dept/Class: " + getDisplayDeptOrClass(records.get(0)) +
                       " • Generated: " + TimeUtils.nowInPhnomPenh().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) + " (Asia/Phnom_Penh)")
                    : ("Enterprise Biometric Management Platform • Generated: " +
                       TimeUtils.nowInPhnomPenh().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) + " (Asia/Phnom_Penh)");
            metaCell.setCellValue(metaInfo);
            XSSFCellStyle metaStyle = workbook.createCellStyle();
            metaStyle.setFont(metaFont);
            metaCell.setCellStyle(metaStyle);

            // 2. Executive KPI Box (Rows 3-4)
            Row kpiHeaderRow = sheet.createRow(3);
            kpiHeaderRow.setHeightInPoints(18);
            String[] kpiTitles = {"TOTAL RECORDS", "PRESENT COUNT", "LATE ARRIVALS", "ABSENT COUNT", "ON LEAVE", "TOTAL WORK HOURS"};

            XSSFCellStyle kpiHeaderStyle = workbook.createCellStyle();
            kpiHeaderStyle.setFont(boldFont);
            kpiHeaderStyle.setFillForegroundColor(new XSSFColor(kpiBgRgb, null));
            kpiHeaderStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            kpiHeaderStyle.setAlignment(HorizontalAlignment.CENTER);
            kpiHeaderStyle.setBorderTop(BorderStyle.THIN);
            kpiHeaderStyle.setBorderBottom(BorderStyle.THIN);

            XSSFCellStyle kpiValStyle = workbook.createCellStyle();
            kpiValStyle.setFont(boldFont);
            kpiValStyle.setAlignment(HorizontalAlignment.CENTER);
            kpiValStyle.setBorderBottom(BorderStyle.THIN);

            for (int i = 0; i < kpiTitles.length; i++) {
                Cell c = kpiHeaderRow.createCell(i);
                c.setCellValue(kpiTitles[i]);
                c.setCellStyle(kpiHeaderStyle);
            }

            Row kpiValRow = sheet.createRow(4);
            kpiValRow.setHeightInPoints(20);
            kpiValRow.createCell(0).setCellValue(totalRecords);
            kpiValRow.createCell(1).setCellValue(presentCount);
            kpiValRow.createCell(2).setCellValue(lateCount);
            kpiValRow.createCell(3).setCellValue(absentCount);
            kpiValRow.createCell(4).setCellValue(leaveCount);
            kpiValRow.createCell(5).setCellValue(String.format("%.1f hrs", totalHours));
            for (int i = 0; i < kpiTitles.length; i++) {
                kpiValRow.getCell(i).setCellStyle(kpiValStyle);
            }

            // 3. Table Column Headers (Row 6)
            int tableStartRow = 6;
            Row headerRow = sheet.createRow(tableStartRow);
            headerRow.setHeightInPoints(26);

            String[] columns = {
                    "No.", "Date", "Role", "PIN", "Full Name", "Department / Class", "Branch",
                    "Shift Rule", "Shift 1 In", "Shift 1 Out (Lunch)", "Shift 2 In (Resume)", "Shift 2 Out",
                    "Late", "Total Work", "Overtime", "Status"
            };

            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);

                // Highlight Shift 1 columns with Amber, Shift 2 with Indigo, others with Navy
                if (i == 8 || i == 9) {
                    cell.setCellStyle(headerS1Style);
                } else if (i == 10 || i == 11) {
                    cell.setCellStyle(headerS2Style);
                } else {
                    cell.setCellStyle(headerNavyStyle);
                }
            }

            // 4. Data Rows
            int rowIdx = tableStartRow + 1;
            int counter = 1;

            for (AttendanceRecordDto r : records) {
                Row row = sheet.createRow(rowIdx++);
                row.setHeightInPoints(20);
                boolean isZebra = (counter % 2 == 0);

                XSSFCellStyle textCell = isZebra ? dataZebraText : dataStyle;
                XSSFCellStyle centerCell = isZebra ? dataZebraCenter : dataCenterStyle;
                XSSFCellStyle monoCell = isZebra ? dataZebraMonoCenter : dataMonoCenter;

                // 0: No.
                Cell c0 = row.createCell(0);
                c0.setCellValue(counter++);
                c0.setCellStyle(centerCell);

                // 1: Date
                Cell c1 = row.createCell(1);
                c1.setCellValue(r.getAttendanceDate() != null ? r.getAttendanceDate().toString() : "");
                c1.setCellStyle(monoCell);

                // 2: Role
                String role = r.getPersonnelType() != null ? r.getPersonnelType().toUpperCase() : "EMPLOYEE";
                Cell c2 = row.createCell(2);
                c2.setCellValue(role);
                if ("STUDENT".equals(role)) {
                    c2.setCellStyle(studentRoleBadge);
                } else if ("TEACHER".equals(role)) {
                    c2.setCellStyle(teacherRoleBadge);
                } else {
                    c2.setCellStyle(staffRoleBadge);
                }

                // 3: PIN
                Cell c3 = row.createCell(3);
                c3.setCellValue(getDisplayCode(r));
                c3.setCellStyle(monoCell);

                // 4: Full Name
                Cell c4 = row.createCell(4);
                c4.setCellValue(getDisplayName(r));
                c4.setCellStyle(textCell);

                // 5: Dept / Class
                Cell c5 = row.createCell(5);
                c5.setCellValue(getDisplayDeptOrClass(r));
                c5.setCellStyle(textCell);

                // 6: Branch
                Cell c6 = row.createCell(6);
                c6.setCellValue(r.getBranchName() != null ? r.getBranchName() : "-");
                c6.setCellStyle(textCell);

                // 7: Shift
                Cell c7 = row.createCell(7);
                c7.setCellValue(r.getShiftName() != null ? r.getShiftName() : "Standard Full");
                c7.setCellStyle(textCell);

                // 8: Shift 1 Check-In
                Instant s1In = r.getShift1CheckIn() != null ? r.getShift1CheckIn() : r.getFirstCheckIn();
                Cell c8 = row.createCell(8);
                c8.setCellValue(formatInstantTime(s1In));
                c8.setCellStyle(monoCell);

                // 9: Shift 1 Check-Out (Lunch Out)
                Instant s1Out = r.getShift1CheckOut();
                Cell c9 = row.createCell(9);
                c9.setCellValue(formatInstantTime(s1Out));
                c9.setCellStyle(monoCell);

                // 10: Shift 2 Check-In (Lunch In / Resume)
                Instant s2In = r.getShift2CheckIn();
                Cell c10 = row.createCell(10);
                c10.setCellValue(formatInstantTime(s2In));
                c10.setCellStyle(monoCell);

                // 11: Shift 2 Check-Out (Evening Out)
                Instant s2Out = r.getShift2CheckOut() != null ? r.getShift2CheckOut() : r.getLastCheckOut();
                Cell c11 = row.createCell(11);
                c11.setCellValue(formatInstantTime(s2Out));
                c11.setCellStyle(monoCell);

                // 12: Late
                Cell c12 = row.createCell(12);
                c12.setCellValue(r.getLateMinutes() > 0 ? "+" + r.getLateMinutes() + "m" : "On Time");
                c12.setCellStyle(monoCell);

                // 13: Total Work
                Cell c13 = row.createCell(13);
                c13.setCellValue(formatWorkTime(r.getTotalWorkMinutes()));
                c13.setCellStyle(monoCell);

                // 14: Overtime
                Cell c14 = row.createCell(14);
                c14.setCellValue(r.getOvertimeMinutes() > 0 ? "+" + r.getOvertimeMinutes() + "m" : "-");
                c14.setCellStyle(centerCell);

                // 15: Status
                String status = r.getStatus() != null ? r.getStatus().toUpperCase() : "-";
                Cell c15 = row.createCell(15);
                c15.setCellValue(status);
                if ("PRESENT".equals(status)) {
                    c15.setCellStyle(presentBadge);
                } else if ("LATE".equals(status)) {
                    c15.setCellStyle(lateBadge);
                } else if ("ABSENT".equals(status)) {
                    c15.setCellStyle(absentBadge);
                } else if ("ON_LEAVE".equals(status)) {
                    c15.setCellStyle(leaveBadge);
                } else {
                    c15.setCellStyle(centerCell);
                }
            }

            // Auto-size columns with safety padding
            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
                int currentWidth = sheet.getColumnWidth(i);
                sheet.setColumnWidth(i, Math.min(256 * 45, currentWidth + 256 * 3));
            }

            // Freeze pane below headers
            sheet.createFreezePane(0, tableStartRow + 1);

            workbook.write(out);
        }
    }

    /**
     * CSV Export with 2-Shift Biometric Punches and Role/Class details.
     */
    public void exportToCsv(List<AttendanceRecordDto> records, OutputStream out) throws Exception {
        try (CSVPrinter printer = new CSVPrinter(new OutputStreamWriter(out, StandardCharsets.UTF_8),
                CSVFormat.DEFAULT.builder().setHeader(
                        "Date", "Role", "PIN", "Full Name", "Department / Class", "Branch", "Shift Rule",
                        "Shift 1 Check-In", "Shift 1 Lunch-Out", "Shift 2 Resume-In", "Shift 2 Check-Out",
                        "Late (min)", "Total Work", "Overtime (min)", "Status", "Remarks"
                ).build())) {

            for (AttendanceRecordDto r : records) {
                Instant s1In = r.getShift1CheckIn() != null ? r.getShift1CheckIn() : r.getFirstCheckIn();
                Instant s1Out = r.getShift1CheckOut();
                Instant s2In = r.getShift2CheckIn();
                Instant s2Out = r.getShift2CheckOut() != null ? r.getShift2CheckOut() : r.getLastCheckOut();

                printer.printRecord(
                        r.getAttendanceDate() != null ? r.getAttendanceDate().toString() : "",
                        r.getPersonnelType() != null ? r.getPersonnelType() : "EMPLOYEE",
                        getDisplayCode(r),
                        getDisplayName(r),
                        getDisplayDeptOrClass(r),
                        r.getBranchName() != null ? r.getBranchName() : "-",
                        r.getShiftName() != null ? r.getShiftName() : "",
                        formatInstantTime(s1In),
                        formatInstantTime(s1Out),
                        formatInstantTime(s2In),
                        formatInstantTime(s2Out),
                        r.getLateMinutes(),
                        formatWorkTime(r.getTotalWorkMinutes()),
                        r.getOvertimeMinutes(),
                        r.getStatus() != null ? r.getStatus() : "",
                        r.getRemarks() != null ? r.getRemarks() : ""
                );
            }
            printer.flush();
        }
    }

    /**
     * Executive PDF Attendance & Timesheet Audit Report in Landscape A4 format,
     * including 2-Shift Biometric Punches, KPI Summary Box, and Sign-off Blocks.
     */
    public void exportToPdf(List<AttendanceRecordDto> records, OutputStream out) throws Exception {
        Document document = new Document(PageSize.A4.rotate(), 18, 18, 20, 20);
        PdfWriter.getInstance(document, out);
        document.open();

        // Palette
        Color primaryNavy = new Color(15, 23, 42);      // #0F172A
        Color secondaryGray = new Color(100, 116, 139); // #64748B
        Color zebraBg = new Color(248, 250, 252);       // #F8FAFC
        Color kpiBoxBg = new Color(241, 245, 249);      // #F1F5F9
        Color s1HeaderBg = new Color(180, 83, 9);       // Amber 700
        Color s2HeaderBg = new Color(67, 56, 202);      // Indigo 700

        // Fonts
        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 15, primaryNavy);
        Font subTitleFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, secondaryGray);
        Font headFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, Color.WHITE);
        Font rowFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, Color.DARK_GRAY);
        Font boldRowFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, Color.BLACK);
        Font monoFont = FontFactory.getFont(FontFactory.COURIER, 7.5f, Color.DARK_GRAY);
        Font kpiTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7, secondaryGray);
        Font kpiValueFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, primaryNavy);

        // 1. Report Header
        long distinctPdfUsers = records.stream()
                .map(this::getDisplayCode)
                .filter(c -> c != null && !"-".equals(c) && !c.isEmpty())
                .distinct()
                .count();

        String titleText = "ATTENDANCE & TIMESHEET AUDIT REPORT";
        String generatedTimestamp = TimeUtils.nowInPhnomPenh().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        String subTitleText = "Enterprise Biometrics Management System • Generated: " + generatedTimestamp + " (Asia/Phnom_Penh)";

        if (distinctPdfUsers == 1 && !records.isEmpty()) {
            AttendanceRecordDto first = records.get(0);
            titleText = "INDIVIDUAL ATTENDANCE TIMESHEET: " + getDisplayName(first);
            subTitleText = "PIN / Code: " + getDisplayCode(first) + " | Role: " +
                    (first.getPersonnelType() != null ? first.getPersonnelType() : "STAFF") +
                    " | Dept / Class: " + getDisplayDeptOrClass(first) + " | Generated: " + generatedTimestamp;
        }

        Paragraph title = new Paragraph(titleText, titleFont);
        title.setAlignment(Element.ALIGN_LEFT);
        document.add(title);

        Paragraph subTitle = new Paragraph(subTitleText, subTitleFont);
        subTitle.setSpacingAfter(8);
        document.add(subTitle);

        // 2. HR Summary KPI Box
        long totalRecords = records.size();
        long presentCount = records.stream().filter(r -> "PRESENT".equalsIgnoreCase(r.getStatus())).count();
        long lateCount = records.stream().filter(r -> "LATE".equalsIgnoreCase(r.getStatus())).count();
        long absentCount = records.stream().filter(r -> "ABSENT".equalsIgnoreCase(r.getStatus())).count();
        long leaveCount = records.stream().filter(r -> "ON_LEAVE".equalsIgnoreCase(r.getStatus())).count();
        double totalWorkHours = records.stream().mapToInt(AttendanceRecordDto::getTotalWorkMinutes).sum() / 60.0;

        PdfPTable kpiTable = new PdfPTable(6);
        kpiTable.setWidthPercentage(100);
        kpiTable.setSpacingAfter(10);

        addKpiBox(kpiTable, "TOTAL RECORDS", String.valueOf(totalRecords), kpiTitleFont, kpiValueFont, kpiBoxBg);
        addKpiBox(kpiTable, "PRESENT", String.valueOf(presentCount), kpiTitleFont, kpiValueFont, kpiBoxBg);
        addKpiBox(kpiTable, "LATE ARRIVALS", String.valueOf(lateCount), kpiTitleFont, kpiValueFont, kpiBoxBg);
        addKpiBox(kpiTable, "ABSENT", String.valueOf(absentCount), kpiTitleFont, kpiValueFont, kpiBoxBg);
        addKpiBox(kpiTable, "ON LEAVE", String.valueOf(leaveCount), kpiTitleFont, kpiValueFont, kpiBoxBg);
        addKpiBox(kpiTable, "TOTAL WORK HOURS", String.format("%.1fh", totalWorkHours), kpiTitleFont, kpiValueFont, kpiBoxBg);
        document.add(kpiTable);

        // 3. Main Attendance Data Table (14 Columns including Branch & 2 Shifts)
        PdfPTable table = new PdfPTable(14);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{
                0.7f, // No.
                1.5f, // Date
                1.2f, // Role
                1.2f, // PIN
                2.7f, // Name
                2.0f, // Dept / Class
                1.5f, // Branch
                1.3f, // S1 In
                1.3f, // S1 Out
                1.3f, // S2 In
                1.3f, // S2 Out
                1.0f, // Late
                1.3f, // Work
                1.4f  // Status
        });

        String[] headers = {
                "No.", "Date", "Role", "PIN", "Full Name", "Dept / Class", "Branch",
                "S1 In", "S1 Out", "S2 In", "S2 Out", "Late", "Work", "Status"
        };

        for (int i = 0; i < headers.length; i++) {
            PdfPCell cell = new PdfPCell(new Phrase(headers[i], headFont));
            if (i == 7 || i == 8) {
                cell.setBackgroundColor(s1HeaderBg);
            } else if (i == 9 || i == 10) {
                cell.setBackgroundColor(s2HeaderBg);
            } else {
                cell.setBackgroundColor(primaryNavy);
            }
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cell.setPadding(4.5f);
            table.addCell(cell);
        }

        int index = 1;
        for (AttendanceRecordDto r : records) {
            boolean isZebra = (index % 2 == 0);
            Color rowBg = isZebra ? zebraBg : Color.WHITE;

            // No.
            addCell(table, String.valueOf(index++), rowFont, Element.ALIGN_CENTER, rowBg);

            // Date
            addCell(table, r.getAttendanceDate() != null ? r.getAttendanceDate().toString() : "", monoFont, Element.ALIGN_CENTER, rowBg);

            // Role
            String role = r.getPersonnelType() != null ? r.getPersonnelType() : "STAFF";
            Font roleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7,
                    "STUDENT".equalsIgnoreCase(role) ? new Color(3, 105, 161) :
                    "TEACHER".equalsIgnoreCase(role) ? new Color(180, 83, 9) :
                    new Color(4, 120, 87));
            addCell(table, role, roleFont, Element.ALIGN_CENTER, rowBg);

            // PIN
            addCell(table, getDisplayCode(r), monoFont, Element.ALIGN_CENTER, rowBg);

            // Name
            addCell(table, getDisplayName(r), boldRowFont, Element.ALIGN_LEFT, rowBg);

            // Dept / Class
            addCell(table, getDisplayDeptOrClass(r), rowFont, Element.ALIGN_LEFT, rowBg);

            // Branch
            addCell(table, r.getBranchName() != null ? r.getBranchName() : "-", rowFont, Element.ALIGN_LEFT, rowBg);

            // Shift 1
            Instant s1In = r.getShift1CheckIn() != null ? r.getShift1CheckIn() : r.getFirstCheckIn();
            Instant s1Out = r.getShift1CheckOut();
            addCell(table, formatInstantTimeShort(s1In), monoFont, Element.ALIGN_CENTER, rowBg);
            addCell(table, formatInstantTimeShort(s1Out), monoFont, Element.ALIGN_CENTER, rowBg);

            // Shift 2
            Instant s2In = r.getShift2CheckIn();
            Instant s2Out = r.getShift2CheckOut() != null ? r.getShift2CheckOut() : r.getLastCheckOut();
            addCell(table, formatInstantTimeShort(s2In), monoFont, Element.ALIGN_CENTER, rowBg);
            addCell(table, formatInstantTimeShort(s2Out), monoFont, Element.ALIGN_CENTER, rowBg);

            // Late
            addCell(table, r.getLateMinutes() > 0 ? "+" + r.getLateMinutes() + "m" : "-", monoFont, Element.ALIGN_CENTER, rowBg);

            // Work
            addCell(table, formatWorkTime(r.getTotalWorkMinutes()), monoFont, Element.ALIGN_CENTER, rowBg);

            // Status
            String status = r.getStatus() != null ? r.getStatus() : "-";
            Font statusFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f,
                    "PRESENT".equalsIgnoreCase(status) ? new Color(22, 101, 52) :
                    "LATE".equalsIgnoreCase(status) ? new Color(146, 64, 14) :
                    "ABSENT".equalsIgnoreCase(status) ? new Color(153, 27, 27) :
                    "ON_LEAVE".equalsIgnoreCase(status) ? new Color(30, 64, 175) : Color.DARK_GRAY);
            addCell(table, status, statusFont, Element.ALIGN_CENTER, rowBg);
        }

        document.add(table);

        // 4. Sign-off Footer Blocks
        Paragraph space = new Paragraph(" ");
        space.setSpacingBefore(12);
        document.add(space);

        PdfPTable signTable = new PdfPTable(3);
        signTable.setWidthPercentage(100);
        signTable.getDefaultCell().setBorder(Rectangle.NO_BORDER);

        Font signTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, Color.DARK_GRAY);
        Font signLineFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, Color.GRAY);

        addSignBlock(signTable, "PREPARED BY (HR SPECIALIST)", "Date: ________________________", signTitleFont, signLineFont);
        addSignBlock(signTable, "VERIFIED BY (DEPARTMENT HEAD)", "Date: ________________________", signTitleFont, signLineFont);
        addSignBlock(signTable, "APPROVED BY (EXECUTIVE DIRECTOR)", "Date: ________________________", signTitleFont, signLineFont);

        document.add(signTable);
        document.close();
    }

    // --- Helpers ---

    private XSSFCellStyle createHeaderStyle(XSSFWorkbook wb, XSSFFont font, byte[] bgRgb) {
        XSSFCellStyle style = wb.createCellStyle();
        style.setFont(font);
        style.setFillForegroundColor(new XSSFColor(bgRgb, null));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.MEDIUM);
        style.setBottomBorderColor(IndexedColors.BLACK.getIndex());
        return style;
    }

    private XSSFCellStyle createBadgeStyle(XSSFWorkbook wb, XSSFFont baseFont, byte[] bgRgb, byte[] textRgb, byte[] borderRgb) {
        XSSFFont font = wb.createFont();
        font.setFontName(baseFont.getFontName());
        font.setFontHeightInPoints(baseFont.getFontHeightInPoints());
        font.setBold(true);
        font.setColor(new XSSFColor(textRgb, null));

        XSSFCellStyle style = wb.createCellStyle();
        style.setFont(font);
        style.setFillForegroundColor(new XSSFColor(bgRgb, null));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderTop(BorderStyle.THIN);
        style.setTopBorderColor(new XSSFColor(borderRgb, null));
        style.setBorderBottom(BorderStyle.THIN);
        style.setBottomBorderColor(new XSSFColor(borderRgb, null));
        style.setBorderLeft(BorderStyle.THIN);
        style.setLeftBorderColor(new XSSFColor(borderRgb, null));
        style.setBorderRight(BorderStyle.THIN);
        style.setRightBorderColor(new XSSFColor(borderRgb, null));
        return style;
    }

    private XSSFCellStyle createBadgeStyle(XSSFWorkbook wb, XSSFFont baseFont, byte[] bgRgb, byte[] textRgb) {
        return createBadgeStyle(wb, baseFont, bgRgb, textRgb, bgRgb);
    }

    /**
     * Executive Excel Summary Report matching the Per-User Grouped Table
     */
    public void exportSummaryToExcel(List<UserSummaryDto> summaries, LocalDate startDate, LocalDate endDate, OutputStream out) throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Personnel Attendance Summary");
            sheet.setDisplayGridlines(true);

            // Palette definitions (RGB)
            byte[] navyHeaderRgb    = new byte[]{(byte) 15, (byte) 23, (byte) 42};    // Slate 900 #0F172A
            byte[] zebraRgb         = new byte[]{(byte) 248, (byte) 250, (byte) 252}; // Slate 50 #F8FAFC
            byte[] borderGrayRgb    = new byte[]{(byte) 226, (byte) 232, (byte) 240}; // Slate 200 #E2E8F0

            // Status Badge Colors
            byte[] presentBgRgb     = new byte[]{(byte) 220, (byte) 252, (byte) 231}; // Emerald 100
            byte[] presentTextRgb   = new byte[]{(byte) 22, (byte) 101, (byte) 52};   // Emerald 800
            byte[] lateBgRgb        = new byte[]{(byte) 254, (byte) 243, (byte) 199}; // Amber 100
            byte[] lateTextRgb      = new byte[]{(byte) 146, (byte) 64, (byte) 14};   // Amber 800
            byte[] absentBgRgb      = new byte[]{(byte) 255, (byte) 228, (byte) 230}; // Rose 100
            byte[] absentTextRgb    = new byte[]{(byte) 159, (byte) 18, (byte) 57};   // Rose 800
            byte[] leaveBgRgb       = new byte[]{(byte) 219, (byte) 234, (byte) 254}; // Blue 100
            byte[] leaveTextRgb     = new byte[]{(byte) 30, (byte) 64, (byte) 175};   // Blue 800

            // Role Badge Colors
            byte[] studentBgRgb     = new byte[]{(byte) 224, (byte) 242, (byte) 254}; // Cyan 100
            byte[] studentTextRgb   = new byte[]{(byte) 3, (byte) 105, (byte) 161};   // Cyan 700
            byte[] teacherBgRgb     = new byte[]{(byte) 254, (byte) 243, (byte) 199}; // Amber 100
            byte[] teacherTextRgb   = new byte[]{(byte) 180, (byte) 83, (byte) 9};    // Amber 700
            byte[] staffBgRgb       = new byte[]{(byte) 209, (byte) 250, (byte) 229}; // Emerald 100
            byte[] staffTextRgb     = new byte[]{(byte) 4, (byte) 120, (byte) 87};    // Emerald 700

            // Fonts
            XSSFFont titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 15);
            titleFont.setColor(new XSSFColor(navyHeaderRgb, null));

            XSSFFont metaFont = workbook.createFont();
            metaFont.setFontHeightInPoints((short) 9);
            metaFont.setColor(IndexedColors.GREY_50_PERCENT.getIndex());

            XSSFFont headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 10);
            headerFont.setColor(IndexedColors.WHITE.getIndex());

            XSSFFont regularFont = workbook.createFont();
            regularFont.setFontHeightInPoints((short) 9);

            XSSFFont boldFont = workbook.createFont();
            boldFont.setBold(true);
            boldFont.setFontHeightInPoints((short) 9);

            XSSFFont monoFont = workbook.createFont();
            monoFont.setFontName("Consolas");
            monoFont.setFontHeightInPoints((short) 9);

            // Cell Styles
            XSSFCellStyle headerStyle = createHeaderStyle(workbook, headerFont, navyHeaderRgb);

            XSSFCellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setFont(regularFont);
            dataStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBottomBorderColor(new XSSFColor(borderGrayRgb, null));

            XSSFCellStyle dataCenterStyle = workbook.createCellStyle();
            dataCenterStyle.cloneStyleFrom(dataStyle);
            dataCenterStyle.setAlignment(HorizontalAlignment.CENTER);

            XSSFCellStyle dataBoldCenter = workbook.createCellStyle();
            dataBoldCenter.cloneStyleFrom(dataCenterStyle);
            dataBoldCenter.setFont(boldFont);

            XSSFCellStyle dataMonoCenter = workbook.createCellStyle();
            dataMonoCenter.cloneStyleFrom(dataCenterStyle);
            dataMonoCenter.setFont(monoFont);

            XSSFCellStyle zebraStyle = workbook.createCellStyle();
            zebraStyle.cloneStyleFrom(dataStyle);
            zebraStyle.setFillForegroundColor(new XSSFColor(zebraRgb, null));
            zebraStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            XSSFCellStyle zebraCenterStyle = workbook.createCellStyle();
            zebraCenterStyle.cloneStyleFrom(dataCenterStyle);
            zebraCenterStyle.setFillForegroundColor(new XSSFColor(zebraRgb, null));
            zebraCenterStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            XSSFCellStyle zebraMonoCenter = workbook.createCellStyle();
            zebraMonoCenter.cloneStyleFrom(dataMonoCenter);
            zebraMonoCenter.setFillForegroundColor(new XSSFColor(zebraRgb, null));
            zebraMonoCenter.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // Badge Styles
            XSSFCellStyle presentBadge = createBadgeStyle(workbook, regularFont, presentBgRgb, presentTextRgb);
            XSSFCellStyle lateBadge    = createBadgeStyle(workbook, regularFont, lateBgRgb, lateTextRgb);
            XSSFCellStyle absentBadge  = createBadgeStyle(workbook, regularFont, absentBgRgb, absentTextRgb);
            XSSFCellStyle leaveBadge   = createBadgeStyle(workbook, regularFont, leaveBgRgb, leaveTextRgb);

            XSSFCellStyle studentBadge = createBadgeStyle(workbook, regularFont, studentBgRgb, studentTextRgb);
            XSSFCellStyle teacherBadge = createBadgeStyle(workbook, regularFont, teacherBgRgb, teacherTextRgb);
            XSSFCellStyle staffBadge   = createBadgeStyle(workbook, regularFont, staffBgRgb, staffTextRgb);

            // Title Block
            Row titleRow = sheet.createRow(0);
            titleRow.setHeightInPoints(24);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("INSTITUTION PERSONNEL ATTENDANCE SUMMARY REPORT");
            XSSFCellStyle titleStyle = workbook.createCellStyle();
            titleStyle.setFont(titleFont);
            titleCell.setCellStyle(titleStyle);

            Row metaRow = sheet.createRow(1);
            metaRow.setHeightInPoints(16);
            Cell metaCell = metaRow.createCell(0);
            metaCell.setCellValue("Period: " + startDate + " to " + endDate + " | Generated: " + DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").format(java.time.LocalDateTime.now()) + " | Total Personnel: " + summaries.size());
            XSSFCellStyle metaStyle = workbook.createCellStyle();
            metaStyle.setFont(metaFont);
            metaCell.setCellStyle(metaStyle);

            // Table Headers matching screenshot
            String[] columns = {
                "#", "PIN / Code", "Personnel Name", "Role", "Department / Class", "Branch",
                "Days Active", "Present", "Late", "Absent", "Leave", "Total Hours", "Punctuality Rate"
            };

            int startRow = 3;
            Row headRow = sheet.createRow(startRow);
            headRow.setHeightInPoints(26);
            for (int i = 0; i < columns.length; i++) {
                Cell c = headRow.createCell(i);
                c.setCellValue(columns[i]);
                c.setCellStyle(headerStyle);
            }

            int rowIdx = startRow + 1;
            int totalActiveDays = 0, totalPresent = 0, totalLate = 0, totalAbsent = 0, totalLeave = 0;
            double totalHoursAll = 0.0;

            for (int i = 0; i < summaries.size(); i++) {
                UserSummaryDto u = summaries.get(i);
                boolean isZebra = (i % 2 == 1);
                Row row = sheet.createRow(rowIdx++);
                row.setHeightInPoints(20);

                totalActiveDays += u.getDaysActive();
                totalPresent += u.getPresent();
                totalLate += u.getLate();
                totalAbsent += u.getAbsent();
                totalLeave += u.getOnLeave();
                totalHoursAll += u.getTotalHours();

                // #
                Cell c0 = row.createCell(0);
                c0.setCellValue(i + 1);
                c0.setCellStyle(isZebra ? zebraCenterStyle : dataCenterStyle);

                // PIN / Code
                Cell c1 = row.createCell(1);
                c1.setCellValue(u.getCode() != null ? u.getCode() : "-");
                c1.setCellStyle(isZebra ? zebraMonoCenter : dataMonoCenter);

                // Name
                Cell c2 = row.createCell(2);
                c2.setCellValue(u.getName() != null ? u.getName() : "-");
                c2.setCellStyle(isZebra ? zebraStyle : dataStyle);

                // Role
                Cell c3 = row.createCell(3);
                String role = u.getPersonnelType() != null ? u.getPersonnelType() : "STAFF";
                c3.setCellValue(role);
                if ("STUDENT".equals(role)) c3.setCellStyle(studentBadge);
                else if ("TEACHER".equals(role)) c3.setCellStyle(teacherBadge);
                else c3.setCellStyle(staffBadge);

                // Dept / Class
                Cell c4 = row.createCell(4);
                c4.setCellValue(u.getDepartmentOrClass() != null ? u.getDepartmentOrClass() : "-");
                c4.setCellStyle(isZebra ? zebraStyle : dataStyle);

                // Branch
                Cell c5 = row.createCell(5);
                c5.setCellValue(u.getBranchName() != null ? u.getBranchName() : "-");
                c5.setCellStyle(isZebra ? zebraStyle : dataStyle);

                // Days Active
                Cell c6 = row.createCell(6);
                c6.setCellValue(u.getDaysActive());
                c6.setCellStyle(isZebra ? zebraMonoCenter : dataMonoCenter);

                // Present
                Cell c7 = row.createCell(7);
                c7.setCellValue(u.getPresent());
                c7.setCellStyle(presentBadge);

                // Late
                Cell c8 = row.createCell(8);
                c8.setCellValue(u.getLate());
                c8.setCellStyle(lateBadge);

                // Absent
                Cell c9 = row.createCell(9);
                c9.setCellValue(u.getAbsent());
                c9.setCellStyle(absentBadge);

                // Leave
                Cell c10 = row.createCell(10);
                c10.setCellValue(u.getOnLeave());
                c10.setCellStyle(leaveBadge);

                // Total Hours
                Cell c11 = row.createCell(11);
                c11.setCellValue(u.getTotalHours() + "h");
                c11.setCellStyle(isZebra ? zebraMonoCenter : dataMonoCenter);

                // Punctuality Rate
                Cell c12 = row.createCell(12);
                c12.setCellValue(u.getPunctualityRate() + "%");
                c12.setCellStyle(isZebra ? zebraMonoCenter : dataMonoCenter);
            }

            // Summary Totals Row
            Row totalRow = sheet.createRow(rowIdx++);
            totalRow.setHeightInPoints(22);
            Cell totLabel = totalRow.createCell(0);
            totLabel.setCellValue("TOTALS & AVERAGES");
            XSSFCellStyle totStyle = workbook.createCellStyle();
            totStyle.cloneStyleFrom(headerStyle);
            totLabel.setCellStyle(totStyle);
            for (int col = 1; col <= 4; col++) {
                Cell c = totalRow.createCell(col);
                c.setCellStyle(totStyle);
            }
            sheet.addMergedRegion(new CellRangeAddress(rowIdx - 1, rowIdx - 1, 0, 4));

            Cell totDays = totalRow.createCell(5);
            totDays.setCellValue(totalActiveDays);
            totDays.setCellStyle(headerStyle);

            Cell totPres = totalRow.createCell(6);
            totPres.setCellValue(totalPresent);
            totPres.setCellStyle(headerStyle);

            Cell totLate = totalRow.createCell(7);
            totLate.setCellValue(totalLate);
            totLate.setCellStyle(headerStyle);

            Cell totAbs = totalRow.createCell(8);
            totAbs.setCellValue(totalAbsent);
            totAbs.setCellStyle(headerStyle);

            Cell totLeave = totalRow.createCell(9);
            totLeave.setCellValue(totalLeave);
            totLeave.setCellStyle(headerStyle);

            Cell totHrs = totalRow.createCell(10);
            totHrs.setCellValue(Math.round(totalHoursAll * 10.0) / 10.0 + "h");
            totHrs.setCellStyle(headerStyle);

            int avgRate = totalActiveDays > 0 ? (int) Math.round(((totalPresent + totalLate) * 100.0) / totalActiveDays) : 0;
            Cell totRate = totalRow.createCell(11);
            totRate.setCellValue(avgRate + "%");
            totRate.setCellStyle(headerStyle);

            // Auto-size columns
            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
                int currentWidth = sheet.getColumnWidth(i);
                sheet.setColumnWidth(i, Math.min(256 * 40, currentWidth + 256 * 3));
            }
            sheet.createFreezePane(0, startRow + 1);

            workbook.write(out);
        }
    }

    /**
     * Executive PDF Summary Report in Landscape A4 matching the Per-User Grouped Table
     */
    public void exportSummaryToPdf(List<UserSummaryDto> summaries, LocalDate startDate, LocalDate endDate, OutputStream out) throws Exception {
        Document document = new Document(PageSize.A4.rotate(), 18, 18, 20, 20);
        PdfWriter.getInstance(document, out);
        document.open();

        // Palette
        Color primaryNavy = new Color(15, 23, 42);      // #0F172A
        Color secondaryGray = new Color(100, 116, 139); // #64748B
        Color zebraBg = new Color(248, 250, 252);       // #F8FAFC
        Color kpiBoxBg = new Color(241, 245, 249);      // #F1F5F9

        Color presentColor = new Color(22, 101, 52);    // Emerald 800
        Color lateColor    = new Color(146, 64, 14);    // Amber 800
        Color absentColor  = new Color(159, 18, 57);    // Rose 800
        Color leaveColor   = new Color(30, 64, 175);    // Blue 800

        // Fonts
        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 15, primaryNavy);
        Font subTitleFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, secondaryGray);
        Font headFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, Color.WHITE);
        Font rowFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, Color.DARK_GRAY);
        Font boldRowFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, Color.BLACK);
        Font monoFont = FontFactory.getFont(FontFactory.COURIER, 7.5f, Color.DARK_GRAY);
        Font kpiTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7, secondaryGray);
        Font kpiValueFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, primaryNavy);

        // Header Title
        Paragraph pTitle = new Paragraph("INSTITUTION ATTENDANCE SUMMARY REPORT", titleFont);
        pTitle.setSpacingAfter(2f);
        document.add(pTitle);

        Paragraph pMeta = new Paragraph(
                "Audit Period: " + startDate + " to " + endDate +
                "  •  Total Personnel: " + summaries.size() +
                "  •  Generated: " + DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").format(java.time.LocalDateTime.now()),
                subTitleFont
        );
        pMeta.setSpacingAfter(8f);
        document.add(pMeta);

        // KPI Box
        int totalDays = summaries.stream().mapToInt(UserSummaryDto::getDaysActive).sum();
        int totalPres = summaries.stream().mapToInt(UserSummaryDto::getPresent).sum();
        int totalLate = summaries.stream().mapToInt(UserSummaryDto::getLate).sum();
        int totalAbs  = summaries.stream().mapToInt(UserSummaryDto::getAbsent).sum();
        int totalLve  = summaries.stream().mapToInt(UserSummaryDto::getOnLeave).sum();
        double totalHrs = summaries.stream().mapToDouble(UserSummaryDto::getTotalHours).sum();
        int avgPunct = totalDays > 0 ? (int) Math.round(((totalPres + totalLate) * 100.0) / totalDays) : 0;

        PdfPTable kpiTable = new PdfPTable(7);
        kpiTable.setWidthPercentage(100);
        kpiTable.setSpacingAfter(8f);
        kpiTable.setWidths(new float[]{14f, 14f, 14f, 14f, 14f, 15f, 15f});

        addKpiBox(kpiTable, "PERSONNEL ROSTER", String.valueOf(summaries.size()), kpiTitleFont, kpiValueFont, kpiBoxBg);
        addKpiBox(kpiTable, "TOTAL ACTIVE DAYS", String.valueOf(totalDays), kpiTitleFont, kpiValueFont, kpiBoxBg);
        addKpiBox(kpiTable, "TOTAL PRESENT", String.valueOf(totalPres), kpiTitleFont, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, presentColor), kpiBoxBg);
        addKpiBox(kpiTable, "TOTAL LATE", String.valueOf(totalLate), kpiTitleFont, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, lateColor), kpiBoxBg);
        addKpiBox(kpiTable, "TOTAL ABSENT", String.valueOf(totalAbs), kpiTitleFont, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, absentColor), kpiBoxBg);
        addKpiBox(kpiTable, "TOTAL WORK HOURS", (Math.round(totalHrs * 10.0) / 10.0) + "h", kpiTitleFont, kpiValueFont, kpiBoxBg);
        addKpiBox(kpiTable, "PUNCTUALITY RATE", avgPunct + "%", kpiTitleFont, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, primaryNavy), kpiBoxBg);

        document.add(kpiTable);

        // Summary Table matching user screenshot
        PdfPTable table = new PdfPTable(11);
        table.setWidthPercentage(100);
        table.setHeaderRows(1);
        table.setWidths(new float[]{4f, 20f, 15f, 12f, 7f, 7f, 7f, 7f, 7f, 7f, 7f});

        String[] headers = {
            "#", "Personnel & Role", "Department / Class", "Branch", "Days Active", "Present", "Late", "Absent", "Leave", "Total Hours", "Punctuality"
        };

        for (String h : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(h, headFont));
            cell.setBackgroundColor(primaryNavy);
            cell.setPadding(4f);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cell.setBorderColor(primaryNavy);
            table.addCell(cell);
        }

        int idx = 1;
        for (UserSummaryDto u : summaries) {
            Color rowBg = (idx % 2 == 0) ? zebraBg : Color.WHITE;

            // #
            addCell(table, String.valueOf(idx++), monoFont, Element.ALIGN_CENTER, rowBg);

            // Personnel & Role
            String nameAndPin = (u.getName() != null ? u.getName() : "Unknown") +
                    " (" + (u.getPersonnelType() != null ? u.getPersonnelType() : "STAFF") + ")" +
                    "\nPIN: " + (u.getCode() != null ? u.getCode() : "-");
            addCell(table, nameAndPin, boldRowFont, Element.ALIGN_LEFT, rowBg);

            // Dept / Class
            addCell(table, u.getDepartmentOrClass() != null ? u.getDepartmentOrClass() : "-", rowFont, Element.ALIGN_LEFT, rowBg);

            // Branch
            addCell(table, u.getBranchName() != null ? u.getBranchName() : "-", rowFont, Element.ALIGN_LEFT, rowBg);

            // Days Active
            addCell(table, String.valueOf(u.getDaysActive()), monoFont, Element.ALIGN_CENTER, rowBg);

            // Present
            addCell(table, String.valueOf(u.getPresent()), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, presentColor), Element.ALIGN_CENTER, rowBg);

            // Late
            addCell(table, String.valueOf(u.getLate()), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, lateColor), Element.ALIGN_CENTER, rowBg);

            // Absent
            addCell(table, String.valueOf(u.getAbsent()), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, absentColor), Element.ALIGN_CENTER, rowBg);

            // Leave
            addCell(table, String.valueOf(u.getOnLeave()), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, leaveColor), Element.ALIGN_CENTER, rowBg);

            // Total Hours
            addCell(table, u.getTotalHours() + "h", monoFont, Element.ALIGN_CENTER, rowBg);

            // Punctuality Rate
            addCell(table, u.getPunctualityRate() + "%", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, primaryNavy), Element.ALIGN_CENTER, rowBg);
        }

        document.add(table);

        // Sign-off blocks
        PdfPTable signTable = new PdfPTable(3);
        signTable.setWidthPercentage(100);
        signTable.setSpacingBefore(16f);
        signTable.setKeepTogether(true);

        Font signTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8f, primaryNavy);
        Font signLineFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, secondaryGray);

        addSignBlock(signTable, "PREPARED BY (TIMEKEEPER)", "Date: ____/____/2026", signTitleFont, signLineFont);
        addSignBlock(signTable, "REVIEWED BY (HR MANAGER)", "Date: ____/____/2026", signTitleFont, signLineFont);
        addSignBlock(signTable, "APPROVED BY (DIRECTOR / PRINCIPAL)", "Date: ____/____/2026", signTitleFont, signLineFont);

        document.add(signTable);
        document.close();
    }

    /**
     * CSV Export for Personnel Summary Table
     */
    public void exportSummaryToCsv(List<UserSummaryDto> summaries, OutputStream out) throws Exception {
        try (CSVPrinter printer = new CSVPrinter(new OutputStreamWriter(out, StandardCharsets.UTF_8),
                CSVFormat.DEFAULT.builder().setHeader(
                        "#", "PIN / Code", "Full Name", "Role", "Department / Class", "Branch",
                        "Days Active", "Present", "Late", "Absent", "Leave", "Total Hours", "Punctuality Rate (%)"
                ).build())) {

            int idx = 1;
            for (UserSummaryDto u : summaries) {
                printer.printRecord(
                        idx++,
                        u.getCode() != null ? u.getCode() : "",
                        u.getName() != null ? u.getName() : "",
                        u.getPersonnelType() != null ? u.getPersonnelType() : "",
                        u.getDepartmentOrClass() != null ? u.getDepartmentOrClass() : "",
                        u.getBranchName() != null ? u.getBranchName() : "",
                        u.getDaysActive(),
                        u.getPresent(),
                        u.getLate(),
                        u.getAbsent(),
                        u.getOnLeave(),
                        u.getTotalHours(),
                        u.getPunctualityRate()
                );
            }
            printer.flush();
        }
    }

    private String getDisplayName(AttendanceRecordDto r) {
        if ("STUDENT".equalsIgnoreCase(r.getPersonnelType())) {
            if (r.getStudentName() != null && !r.getStudentName().trim().isEmpty()) {
                return r.getStudentName();
            }
        }
        return r.getEmployeeName() != null ? r.getEmployeeName() : (r.getStudentName() != null ? r.getStudentName() : "-");
    }

    private String getDisplayCode(AttendanceRecordDto r) {
        if ("STUDENT".equalsIgnoreCase(r.getPersonnelType())) {
            if (r.getStudentCode() != null && !r.getStudentCode().trim().isEmpty()) {
                return r.getStudentCode();
            }
        }
        return r.getEmployeeCode() != null ? r.getEmployeeCode() : (r.getStudentCode() != null ? r.getStudentCode() : "-");
    }

    private String getDisplayDeptOrClass(AttendanceRecordDto r) {
        if ("STUDENT".equalsIgnoreCase(r.getPersonnelType())) {
            String grade = r.getStudentGrade() != null ? r.getStudentGrade() : "";
            String cls = r.getStudentClassName() != null ? r.getStudentClassName() : "";
            String full = (grade + " " + cls).trim();
            return full.isEmpty() ? "Student" : full;
        }
        return r.getDepartmentName() != null ? r.getDepartmentName() : "Staff";
    }

    private String formatInstantTime(Instant instant) {
        if (instant == null) return "--:--:--";
        try {
            return TimeUtils.formatPhnomPenh(instant).substring(11);
        } catch (Exception e) {
            return "--:--:--";
        }
    }

    private String formatInstantTimeShort(Instant instant) {
        if (instant == null) return "--:--";
        try {
            return TimeUtils.formatPhnomPenh(instant).substring(11, 16);
        } catch (Exception e) {
            return "--:--";
        }
    }

    private String formatWorkTime(int totalMinutes) {
        if (totalMinutes <= 0) return "0h 0m";
        return (totalMinutes / 60) + "h " + (totalMinutes % 60) + "m";
    }

    private void addKpiBox(PdfPTable table, String title, String value, Font titleFont, Font valFont, Color bg) {
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(bg);
        cell.setPadding(5);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setBorderColor(new Color(226, 232, 240));

        Paragraph pTitle = new Paragraph(title, titleFont);
        pTitle.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(pTitle);

        Paragraph pVal = new Paragraph(value, valFont);
        pVal.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(pVal);

        table.addCell(cell);
    }

    private void addCell(PdfPTable table, String text, Font font, int alignment, Color bg) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(bg);
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(4f);
        cell.setBorderColor(new Color(226, 232, 240));
        table.addCell(cell);
    }

    private void addSignBlock(PdfPTable table, String role, String datePlaceholder, Font titleFont, Font lineFont) {
        PdfPCell cell = new PdfPCell();
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);

        Paragraph p1 = new Paragraph(role, titleFont);
        p1.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(p1);

        Paragraph pLine = new Paragraph("\n\n________________________________\nSignature", lineFont);
        pLine.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(pLine);

        Paragraph pDate = new Paragraph(datePlaceholder, lineFont);
        pDate.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(pDate);

        table.addCell(cell);
    }
}
