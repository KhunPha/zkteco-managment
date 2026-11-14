package com.zkteco.attendance.modules.personnel;

import java.util.List;
import java.util.Map;
import com.zkteco.attendance.modules.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PersonnelCodeGeneratorService {

    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public String generateNextUniqueCode() {
        String activeTenant = TenantContext.resolveEffectiveTenant();
        boolean isAll = "all".equalsIgnoreCase(activeTenant);
        String sql;
        Long nextVal;
        try {
            if (isAll) {
                sql = """
                    WITH existing_codes AS (
                        SELECT CAST(REGEXP_REPLACE(employee_code, '[^0-9]', '', 'g') AS BIGINT) AS code_num 
                        FROM employees 
                        WHERE employee_code ~ '^[0-9]+$' AND deleted_at IS NULL
                        UNION
                        SELECT CAST(REGEXP_REPLACE(student_code, '[^0-9]', '', 'g') AS BIGINT) AS code_num 
                        FROM students 
                        WHERE student_code ~ '^[0-9]+$' AND deleted_at IS NULL
                        UNION
                        SELECT CAST(REGEXP_REPLACE(adu.device_pin, '[^0-9]', '', 'g') AS BIGINT) AS code_num 
                        FROM attendance_device_users adu
                        LEFT JOIN employees e ON adu.employee_id = e.id
                        LEFT JOIN students s ON adu.student_id = s.id
                        WHERE adu.device_pin ~ '^[0-9]+$'
                          AND (e.id IS NULL OR e.deleted_at IS NULL)
                          AND (s.id IS NULL OR s.deleted_at IS NULL)
                    ),
                    candidates AS (
                        SELECT 1 AS n
                        UNION ALL
                        SELECT code_num + 1 AS n FROM existing_codes WHERE code_num >= 1
                    )
                    SELECT MIN(n)
                    FROM candidates
                    WHERE n NOT IN (SELECT code_num FROM existing_codes);
                """;
                nextVal = jdbcTemplate.queryForObject(sql, Long.class);
            } else {
                String tenant = activeTenant.trim().toLowerCase();
                sql = """
                    WITH existing_codes AS (
                        SELECT CAST(REGEXP_REPLACE(employee_code, '[^0-9]', '', 'g') AS BIGINT) AS code_num 
                        FROM employees 
                        WHERE employee_code ~ '^[0-9]+$' AND deleted_at IS NULL AND company_code = ?
                        UNION
                        SELECT CAST(REGEXP_REPLACE(student_code, '[^0-9]', '', 'g') AS BIGINT) AS code_num 
                        FROM students 
                        WHERE student_code ~ '^[0-9]+$' AND deleted_at IS NULL AND company_code = ?
                        UNION
                        SELECT CAST(REGEXP_REPLACE(adu.device_pin, '[^0-9]', '', 'g') AS BIGINT) AS code_num 
                        FROM attendance_device_users adu
                        LEFT JOIN employees e ON adu.employee_id = e.id
                        LEFT JOIN students s ON adu.student_id = s.id
                        WHERE adu.device_pin ~ '^[0-9]+$' AND adu.company_code = ?
                          AND (e.id IS NULL OR e.deleted_at IS NULL)
                          AND (s.id IS NULL OR s.deleted_at IS NULL)
                    ),
                    candidates AS (
                        SELECT 1 AS n
                        UNION ALL
                        SELECT code_num + 1 AS n FROM existing_codes WHERE code_num >= 1
                    )
                    SELECT MIN(n)
                    FROM candidates
                    WHERE n NOT IN (SELECT code_num FROM existing_codes);
                """;
                nextVal = jdbcTemplate.queryForObject(sql, Long.class, tenant, tenant, tenant);
            }
            if (nextVal == null || nextVal < 1) {
                nextVal = 1L;
            }
            return String.valueOf(nextVal);
        } catch (Exception e) {
            log.warn("Failed to compute next numeric code from database: {}", e.getMessage());
            return "1";
        }
    }

    @Transactional(readOnly = true)
    public String generateNextIdNumber(String personnelType, String yearInput) {
        String activeTenant = TenantContext.resolveEffectiveTenant();
        boolean isAll = "all".equalsIgnoreCase(activeTenant);

        // 1. Determine prefix and target table
        String basePrefix;
        String table;
        String extraFilter;
        if ("TEACHER".equalsIgnoreCase(personnelType)) {
            basePrefix = "FBIST";
            table = "employees";
            extraFilter = " AND (staff_type = 'TEACHER' OR is_teacher = TRUE)";
        } else if ("EMPLOYEE".equalsIgnoreCase(personnelType) || "STAFF".equalsIgnoreCase(personnelType)) {
            basePrefix = "FBISS";
            table = "employees";
            extraFilter = " AND (staff_type = 'EMPLOYEE' AND is_teacher = FALSE)";
        } else {
            basePrefix = "FBIS";
            table = "students";
            extraFilter = "";
        }

        // 2. Normalize 2-digit year (e.g. "25", "26", "27")
        String yy = normalizeYear(yearInput);
        String targetPrefix = basePrefix + yy;
        String regex = "^" + targetPrefix + "[0-9]{4}$";

        try {
            String sql;
            Integer maxSeq;
            int prefixLen = targetPrefix.length();
            if (isAll) {
                sql = "SELECT COALESCE(MAX(CAST(SUBSTRING(id_number FROM " + (prefixLen + 1) + ") AS INTEGER)), 0) " +
                      "FROM " + table + " WHERE id_number ~ ? AND deleted_at IS NULL " + extraFilter;
                maxSeq = jdbcTemplate.queryForObject(sql, Integer.class, regex);
            } else {
                String tenant = activeTenant.trim().toLowerCase();
                sql = "SELECT COALESCE(MAX(CAST(SUBSTRING(id_number FROM " + (prefixLen + 1) + ") AS INTEGER)), 0) " +
                      "FROM " + table + " WHERE id_number ~ ? AND company_code = ? AND deleted_at IS NULL " + extraFilter;
                maxSeq = jdbcTemplate.queryForObject(sql, Integer.class, regex, tenant);
            }

            int nextIndex = (maxSeq != null ? maxSeq : 0) + 1;
            return targetPrefix + String.format("%04d", nextIndex);
        } catch (Exception e) {
            log.warn("Failed to generate next id_number for prefix {}: {}", targetPrefix, e.getMessage());
            return targetPrefix + "0001";
        }
    }

    public String normalizeYear(String yearInput) {
        int fallbackYear = java.time.LocalDate.now().getYear() % 100;
        if (yearInput == null || yearInput.trim().isEmpty()) {
            return String.format("%02d", fallbackYear);
        }

        String cleaned = yearInput.trim();
        if (cleaned.contains("-")) {
            cleaned = cleaned.split("-")[0].trim();
        }
        String digits = cleaned.replaceAll("[^0-9]", "");
        if (digits.length() >= 4) {
            // e.g. "2026" -> "26"
            return digits.substring(digits.length() - 2);
        } else if (digits.length() == 2) {
            return digits;
        } else if (digits.length() == 1) {
            return "0" + digits;
        } else {
            return String.format("%02d", fallbackYear);
        }
    }
}
