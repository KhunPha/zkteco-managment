package com.zkteco.attendance.modules.personnel;

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
        String sql = """
            SELECT COALESCE(MAX(code_num), 40000) + 1 FROM (
                SELECT CAST(employee_code AS BIGINT) AS code_num FROM employees WHERE employee_code ~ '^[0-9]+$'
                UNION ALL
                SELECT CAST(student_code AS BIGINT) AS code_num FROM students WHERE student_code ~ '^[0-9]+$'
                UNION ALL
                SELECT CAST(device_pin AS BIGINT) AS code_num FROM attendance_device_users WHERE device_pin ~ '^[0-9]+$'
            ) sub;
        """;
        try {
            Long nextVal = jdbcTemplate.queryForObject(sql, Long.class);
            if (nextVal == null || nextVal < 40001) {
                nextVal = 40002L;
            }
            return String.valueOf(nextVal);
        } catch (Exception e) {
            log.warn("Failed to compute max numeric code from database: {}", e.getMessage());
            return String.valueOf(System.currentTimeMillis() % 1000000);
        }
    }
}

