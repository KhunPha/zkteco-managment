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
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
public class ReportExportService {

    /**
     * Professional, executive Excel report designed specifically for HR audits,
     * timesheets, and management payroll reviews.
     */
    public void exportToExcel(List<AttendanceRecordDto> records, OutputStream out) throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("HR Attendance Timesheet");
            sheet.setDisplayGridlines(true);

            // Palette definitions
            byte[] primaryNavyRgb = new byte[]{(byte) 30, (byte) 58, (byte) 138}; // #1E3A8A (Indigo 900)
            byte[] headerBlueRgb = new byte[]{(byte) 49, (byte) 46, (byte) 129};  // #312E81
            byte[] zebraRgb = new byte[]{(byte) 248, (byte) 250, (byte) 252};      // #F8FAFC
            byte[] kpiBgRgb = new byte[]{(byte) 241, (byte) 245, (byte) 249};      // #F1F5F9
            byte[] borderGrayRgb = new byte[]{(byte) 226, (byte) 232, (byte) 240}; // #E2E8F0

            // Font styles
            XSSFFont titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 16);
            titleFont.setColor(new XSSFColor(primaryNavyRgb, null));

            XSSFFont subTitleFont = workbook.createFont();
            subTitleFont.setFontHeightInPoints((short) 10);
            subTitleFont.setColor(IndexedColors.GREY_50_PERCENT.getIndex());

            XSSFFont headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 10);
            headerFont.setColor(IndexedColors.WHITE.getIndex());

            XSSFFont regularFont = workbook.createFont();
            regularFont.setFontHeightInPoints((short) 9);

            XSSFFont boldFont = workbook.createFont();
            boldFont.setBold(true);
            boldFont.setFontHeightInPoints((short) 9);

            // Style: Header row
            XSSFCellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(new XSSFColor(headerBlueRgb, null));
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.MEDIUM);
            headerStyle.setBottomBorderColor(IndexedColors.BLACK.getIndex());

            // Style: Standard Data Cells
            XSSFCellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setFont(regularFont);
            dataStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBottomBorderColor(new XSSFColor(borderGrayRgb, null));

            XSSFCellStyle dataCenterStyle = workbook.createCellStyle();
            dataCenterStyle.cloneStyleFrom(dataStyle);
            dataCenterStyle.setAlignment(HorizontalAlignment.CENTER);

            XSSFCellStyle dataZebraStyle = workbook.createCellStyle();
            dataZebraStyle.cloneStyleFrom(dataStyle);
            dataZebraStyle.setFillForegroundColor(new XSSFColor(zebraRgb, null));
            dataZebraStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            XSSFCellStyle dataZebraCenterStyle = workbook.createCellStyle();
            dataZebraCenterStyle.cloneStyleFrom(dataCenterStyle);
            dataZebraCenterStyle.setFillForegroundColor(new XSSFColor(zebraRgb, null));
            dataZebraCenterStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // KPI calculation
            long totalRecords = records.size();
            long presentCount = records.stream().filter(r -> "PRESENT".equalsIgnoreCase(r.getStatus())).count();
            long lateCount = records.stream().filter(r -> "LATE".equalsIgnoreCase(r.getStatus())).count();
            long absentCount = records.stream().filter(r -> "ABSENT".equalsIgnoreCase(r.getStatus())).count();
            long leaveCount = records.stream().filter(r -> "ON_LEAVE".equalsIgnoreCase(r.getStatus())).count();
            double totalHours = records.stream().mapToInt(AttendanceRecordDto::getTotalWorkMinutes).sum() / 60.0;

            // 1. Report Title Header Block
            Row titleRow = sheet.createRow(0);
            titleRow.setHeightInPoints(24);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("WORKFORCE ATTENDANCE & TIMESHEET REPORT");
            XSSFCellStyle titleStyle = workbook.createCellStyle();
            titleStyle.setFont(titleFont);
            titleCell.setCellStyle(titleStyle);

            Row metaRow = sheet.createRow(1);
            Cell metaCell = metaRow.createCell(0);
            metaCell.setCellValue("Generated for HR Operations • Generated On: " + TimeUtils.nowInPhnomPenh().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")) + " (Asia/Phnom_Penh)");
            XSSFCellStyle metaStyle = workbook.createCellStyle();
            metaStyle.setFont(subTitleFont);
            metaCell.setCellStyle(metaStyle);

            // 2. HR Summary KPI Box (Rows 3-4)
            Row kpiHeaderRow = sheet.createRow(3);
            kpiHeaderRow.setHeightInPoints(18);
            String[] kpiTitles = {"TOTAL RECORDS", "PRESENT COUNT", "LATE ARRIVALS", "ABSENT COUNT", "TOTAL WORK HOURS"};
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
            kpiValRow.createCell(4).setCellValue(String.format("%.1f hrs", totalHours));
            for (int i = 0; i < kpiTitles.length; i++) {
                kpiValRow.getCell(i).setCellStyle(kpiValStyle);
            }

            // 3. Table Column Headers (Row 6)
            int tableStartRow = 6;
            Row headerRow = sheet.createRow(tableStartRow);
            headerRow.setHeightInPoints(24);

            String[] columns = {
                    "No.", "Date", "Emp Code", "Employee Name", "Department",
                    "Shift Schedule", "Check In", "Check Out", "Late (min)",
                    "Early Leave", "Work (hrs)", "Status", "Remarks"
            };

            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            // 4. Data Rows
            int rowIdx = tableStartRow + 1;
            int counter = 1;

            for (AttendanceRecordDto r : records) {
                Row row = sheet.createRow(rowIdx++);
                row.setHeightInPoints(19);
                boolean isZebra = (counter % 2 == 0);

                XSSFCellStyle defaultText = isZebra ? dataZebraStyle : dataStyle;
                XSSFCellStyle defaultCenter = isZebra ? dataZebraCenterStyle : dataCenterStyle;

                // No.
                Cell c0 = row.createCell(0);
                c0.setCellValue(counter++);
                c0.setCellStyle(defaultCenter);

                // Date
                Cell c1 = row.createCell(1);
                c1.setCellValue(r.getAttendanceDate() != null ? r.getAttendanceDate().toString() : "");
                c1.setCellStyle(defaultCenter);

                // Emp Code
                Cell c2 = row.createCell(2);
                c2.setCellValue(r.getEmployeeCode() != null ? r.getEmployeeCode() : "");
                c2.setCellStyle(defaultCenter);

                // Employee Name
                Cell c3 = row.createCell(3);
                c3.setCellValue(r.getEmployeeName() != null ? r.getEmployeeName() : "");
                c3.setCellStyle(defaultText);

                // Department
                Cell c4 = row.createCell(4);
                c4.setCellValue(r.getDepartmentName() != null ? r.getDepartmentName() : "-");
                c4.setCellStyle(defaultText);

                // Shift
                Cell c5 = row.createCell(5);
                c5.setCellValue(r.getShiftName() != null ? r.getShiftName() : "Standard 8h");
                c5.setCellStyle(defaultText);

                // Check In
                Cell c6 = row.createCell(6);
                c6.setCellValue(r.getFirstCheckIn() != null ? TimeUtils.formatPhnomPenh(r.getFirstCheckIn()).substring(11) : "--:--:--");
                c6.setCellStyle(defaultCenter);

                // Check Out
                Cell c7 = row.createCell(7);
                c7.setCellValue(r.getLastCheckOut() != null ? TimeUtils.formatPhnomPenh(r.getLastCheckOut()).substring(11) : "--:--:--");
                c7.setCellStyle(defaultCenter);

                // Late
                Cell c8 = row.createCell(8);
                c8.setCellValue(r.getLateMinutes() > 0 ? "+" + r.getLateMinutes() : "0");
                c8.setCellStyle(defaultCenter);

                // Early Leave
                Cell c9 = row.createCell(9);
                c9.setCellValue(r.getEarlyLeaveMinutes() > 0 ? "-" + r.getEarlyLeaveMinutes() : "0");
                c9.setCellStyle(defaultCenter);

                // Work Hours
                Cell c10 = row.createCell(10);
                double workHours = Math.round((r.getTotalWorkMinutes() / 60.0) * 10.0) / 10.0;
                c10.setCellValue(workHours > 0 ? String.format("%.1f", workHours) : "0.0");
                c10.setCellStyle(defaultCenter);

                // Status
                Cell c11 = row.createCell(11);
                c11.setCellValue(r.getStatus() != null ? r.getStatus() : "");
                c11.setCellStyle(defaultCenter);

                // Remarks
                Cell c12 = row.createCell(12);
                c12.setCellValue(r.getRemarks() != null ? r.getRemarks() : "");
                c12.setCellStyle(defaultText);
            }

            // Auto-size columns with safety padding
            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
                int currentWidth = sheet.getColumnWidth(i);
                sheet.setColumnWidth(i, Math.min(256 * 40, currentWidth + 256 * 3));
            }

            // Freeze header so HR can scroll through thousands of rows easily
            sheet.createFreezePane(0, tableStartRow + 1);

            workbook.write(out);
        }
    }

    public void exportToCsv(List<AttendanceRecordDto> records, OutputStream out) throws Exception {
        try (CSVPrinter printer = new CSVPrinter(new OutputStreamWriter(out, StandardCharsets.UTF_8),
                CSVFormat.DEFAULT.builder().setHeader(
                        "Date", "Employee Code", "Employee Name", "Department", "Shift",
                        "Check In", "Check Out", "Late (min)", "Early Leave (min)", "Work (hours)", "Status", "Remarks"
                ).build())) {

            for (AttendanceRecordDto r : records) {
                double workHours = Math.round((r.getTotalWorkMinutes() / 60.0) * 10.0) / 10.0;
                printer.printRecord(
                        r.getAttendanceDate() != null ? r.getAttendanceDate().toString() : "",
                        r.getEmployeeCode() != null ? r.getEmployeeCode() : "",
                        r.getEmployeeName() != null ? r.getEmployeeName() : "",
                        r.getDepartmentName() != null ? r.getDepartmentName() : "",
                        r.getShiftName() != null ? r.getShiftName() : "",
                        r.getFirstCheckIn() != null ? TimeUtils.formatPhnomPenh(r.getFirstCheckIn()).substring(11) : "",
                        r.getLastCheckOut() != null ? TimeUtils.formatPhnomPenh(r.getLastCheckOut()).substring(11) : "",
                        r.getLateMinutes(),
                        r.getEarlyLeaveMinutes(),
                        workHours,
                        r.getStatus() != null ? r.getStatus() : "",
                        r.getRemarks() != null ? r.getRemarks() : ""
                );
            }
            printer.flush();
        }
    }

    /**
     * Executive PDF Attendance & Timesheet Audit Report in Landscape A4 format,
     * including KPI Summary, formatted data table, and HR Manager sign-off blocks.
     */
    public void exportToPdf(List<AttendanceRecordDto> records, OutputStream out) throws Exception {
        Document document = new Document(PageSize.A4.rotate(), 20, 20, 25, 25);
        PdfWriter.getInstance(document, out);
        document.open();

        // Palette
        Color primaryNavy = new Color(30, 58, 138);     // #1E3A8A
        Color secondaryGray = new Color(100, 116, 139); // #64748B
        Color zebraBg = new Color(248, 250, 252);       // #F8FAFC
        Color kpiBoxBg = new Color(241, 245, 249);      // #F1F5F9

        // Fonts
        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, primaryNavy);
        Font subTitleFont = FontFactory.getFont(FontFactory.HELVETICA, 8, secondaryGray);
        Font headFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE);
        Font rowFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.DARK_GRAY);
        Font boldRowFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.BLACK);
        Font kpiTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7, secondaryGray);
        Font kpiValueFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, primaryNavy);

        // 1. Report Header
        Paragraph title = new Paragraph("WORKFORCE ATTENDANCE & TIMESHEET AUDIT REPORT", titleFont);
        title.setAlignment(Element.ALIGN_LEFT);
        document.add(title);

        String generatedTimestamp = TimeUtils.nowInPhnomPenh().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        Paragraph subTitle = new Paragraph("Enterprise Biometrics Management System • Generated: " + generatedTimestamp + " (Asia/Phnom_Penh)", subTitleFont);
        subTitle.setSpacingAfter(10);
        document.add(subTitle);

        // 2. HR Summary KPI Box
        long totalRecords = records.size();
        long presentCount = records.stream().filter(r -> "PRESENT".equalsIgnoreCase(r.getStatus())).count();
        long lateCount = records.stream().filter(r -> "LATE".equalsIgnoreCase(r.getStatus())).count();
        long absentCount = records.stream().filter(r -> "ABSENT".equalsIgnoreCase(r.getStatus())).count();
        long leaveCount = records.stream().filter(r -> "ON_LEAVE".equalsIgnoreCase(r.getStatus())).count();
        double totalWorkHours = records.stream().mapToInt(AttendanceRecordDto::getTotalWorkMinutes).sum() / 60.0;
        double punctualityRate = (totalRecords > 0) ? ((double) presentCount / totalRecords) * 100.0 : 0.0;

        PdfPTable kpiTable = new PdfPTable(6);
        kpiTable.setWidthPercentage(100);
        kpiTable.setSpacingAfter(12);

        addKpiBox(kpiTable, "TOTAL RECORDS", String.valueOf(totalRecords), kpiTitleFont, kpiValueFont, kpiBoxBg);
        addKpiBox(kpiTable, "PRESENT", String.valueOf(presentCount), kpiTitleFont, kpiValueFont, kpiBoxBg);
        addKpiBox(kpiTable, "LATE ARRIVALS", String.valueOf(lateCount), kpiTitleFont, kpiValueFont, kpiBoxBg);
        addKpiBox(kpiTable, "ABSENT", String.valueOf(absentCount), kpiTitleFont, kpiValueFont, kpiBoxBg);
        addKpiBox(kpiTable, "ON LEAVE", String.valueOf(leaveCount), kpiTitleFont, kpiValueFont, kpiBoxBg);
        addKpiBox(kpiTable, "TOTAL HOURS", String.format("%.1fh", totalWorkHours), kpiTitleFont, kpiValueFont, kpiBoxBg);
        document.add(kpiTable);

        // 3. Main Attendance Data Table
        PdfPTable table = new PdfPTable(10);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.2f, 2.2f, 2.2f, 4.2f, 3.2f, 2.0f, 2.0f, 1.8f, 2.0f, 2.4f});

        String[] headers = {
                "No.", "Date", "Emp ID", "Employee Name", "Department",
                "Check In", "Check Out", "Late", "Work (h)", "Status"
        };

        for (String header : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(header, headFont));
            cell.setBackgroundColor(primaryNavy);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cell.setPadding(5);
            table.addCell(cell);
        }

        int index = 1;
        for (AttendanceRecordDto r : records) {
            boolean isZebra = (index % 2 == 0);
            Color rowBg = isZebra ? zebraBg : Color.WHITE;

            addCell(table, String.valueOf(index++), rowFont, Element.ALIGN_CENTER, rowBg);
            addCell(table, r.getAttendanceDate() != null ? r.getAttendanceDate().toString() : "", rowFont, Element.ALIGN_CENTER, rowBg);
            addCell(table, r.getEmployeeCode() != null ? r.getEmployeeCode() : "", boldRowFont, Element.ALIGN_CENTER, rowBg);
            addCell(table, r.getEmployeeName() != null ? r.getEmployeeName() : "", boldRowFont, Element.ALIGN_LEFT, rowBg);
            addCell(table, r.getDepartmentName() != null ? r.getDepartmentName() : "-", rowFont, Element.ALIGN_LEFT, rowBg);

            String inTime = r.getFirstCheckIn() != null ? TimeUtils.formatPhnomPenh(r.getFirstCheckIn()).substring(11) : "--:--";
            String outTime = r.getLastCheckOut() != null ? TimeUtils.formatPhnomPenh(r.getLastCheckOut()).substring(11) : "--:--";
            addCell(table, inTime, rowFont, Element.ALIGN_CENTER, rowBg);
            addCell(table, outTime, rowFont, Element.ALIGN_CENTER, rowBg);

            addCell(table, r.getLateMinutes() > 0 ? "+" + r.getLateMinutes() + "m" : "-", rowFont, Element.ALIGN_CENTER, rowBg);

            double workH = Math.round((r.getTotalWorkMinutes() / 60.0) * 10.0) / 10.0;
            addCell(table, workH > 0 ? String.format("%.1f", workH) : "0.0", boldRowFont, Element.ALIGN_CENTER, rowBg);

            // Status Cell
            String status = r.getStatus() != null ? r.getStatus() : "-";
            Font statusFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8,
                    "PRESENT".equalsIgnoreCase(status) ? new Color(22, 101, 52) :
                    "LATE".equalsIgnoreCase(status) ? new Color(146, 64, 14) :
                    "ABSENT".equalsIgnoreCase(status) ? new Color(153, 27, 27) : Color.DARK_GRAY);
            addCell(table, status, statusFont, Element.ALIGN_CENTER, rowBg);
        }

        document.add(table);

        // 4. Verification & Sign-off Footer
        Paragraph space = new Paragraph(" ");
        space.setSpacingBefore(18);
        document.add(space);

        PdfPTable signTable = new PdfPTable(3);
        signTable.setWidthPercentage(100);
        signTable.getDefaultCell().setBorder(Rectangle.NO_BORDER);

        Font signTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.DARK_GRAY);
        Font signLineFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.GRAY);

        addSignBlock(signTable, "PREPARED BY (HR SPECIALIST)", "Date: ________________________", signTitleFont, signLineFont);
        addSignBlock(signTable, "VERIFIED BY (DEPARTMENT HEAD)", "Date: ________________________", signTitleFont, signLineFont);
        addSignBlock(signTable, "APPROVED BY (HR DIRECTOR)", "Date: ________________________", signTitleFont, signLineFont);

        document.add(signTable);

        document.close();
    }

    private void addKpiBox(PdfPTable table, String title, String value, Font titleFont, Font valFont, Color bg) {
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(bg);
        cell.setPadding(6);
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
        cell.setPadding(4.5f);
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
