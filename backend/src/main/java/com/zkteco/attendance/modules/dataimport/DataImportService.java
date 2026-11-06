package com.zkteco.attendance.modules.dataimport;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zkteco.attendance.modules.attendance.AttendanceRawLog;
import com.zkteco.attendance.modules.attendance.AttendanceRawLogRepository;
import com.zkteco.attendance.modules.dataimport.dto.DataImportStatusDto;
import com.zkteco.attendance.modules.device.AttendanceDevice;
import com.zkteco.attendance.modules.device.AttendanceDeviceUser;
import com.zkteco.attendance.modules.device.DeviceRepository;
import com.zkteco.attendance.modules.device.DeviceUserRepository;
import com.zkteco.attendance.modules.personnel.Employee;
import com.zkteco.attendance.modules.personnel.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class DataImportService {

    private final DeviceRepository deviceRepository;
    private final DeviceUserRepository deviceUserRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceRawLogRepository rawLogRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public DataImportStatusDto getImportStatus() {
        long totalDevices = deviceRepository.count();
        long totalEmployees = employeeRepository.count();
        long totalDeviceUsers = deviceUserRepository.count();
        long totalRawLogs = rawLogRepository.count();

        List<AttendanceDeviceUser> allUsers = deviceUserRepository.findAll();
        long adminCount = allUsers.stream().filter(u -> "ADMIN".equalsIgnoreCase(u.getPrivilege())).count();
        long enrollerCount = allUsers.stream().filter(u -> "ENROLLER".equalsIgnoreCase(u.getPrivilege())).count();
        long normalCount = allUsers.stream().filter(u -> "NORMAL_USER".equalsIgnoreCase(u.getPrivilege())).count();

        List<DataImportStatusDto.UserRoleSummary> privilegedList = new ArrayList<>();
        for (AttendanceDeviceUser u : allUsers) {
            if ("ADMIN".equalsIgnoreCase(u.getPrivilege()) || "ENROLLER".equalsIgnoreCase(u.getPrivilege())) {
                privilegedList.add(DataImportStatusDto.UserRoleSummary.builder()
                        .pin(u.getDevicePin())
                        .name(u.getNameOnDevice())
                        .role(u.getPrivilege())
                        .cardNumber(u.getCardNumber())
                        .fingerprintCount(u.getFingerprintCount())
                        .deviceName(u.getDevice() != null ? u.getDevice().getName() : "Unknown")
                        .build());
            }
        }

        List<DataImportStatusDto.BackupFileSummary> backupFiles = new ArrayList<>();
        File backup1 = new File("IN01A_backup_20261105_104822.json");
        if (backup1.exists()) {
            backupFiles.add(DataImportStatusDto.BackupFileSummary.builder()
                    .fileName(backup1.getName())
                    .fileSize(backup1.length())
                    .description("Full IN01-A Terminal Backup (1,553 Users, 7,865 Punches)")
                    .estimatedUsers(1553)
                    .estimatedLogs(7865)
                    .build());
        }

        File backup2 = new File("backups/fp_templates_backup_20261106_112452.json");
        if (backup2.exists()) {
            backupFiles.add(DataImportStatusDto.BackupFileSummary.builder()
                    .fileName(backup2.getName())
                    .fileSize(backup2.length())
                    .description("Fingerprint Biometric Templates (101 Biometric Minutiae Vectors)")
                    .estimatedUsers(68)
                    .estimatedLogs(0)
                    .build());
        }

        return DataImportStatusDto.builder()
                .totalDevices(totalDevices)
                .totalEmployees(totalEmployees)
                .totalDeviceUsers(totalDeviceUsers)
                .totalRawLogs(totalRawLogs)
                .adminCount(adminCount)
                .enrollerCount(enrollerCount)
                .normalUserCount(normalCount)
                .privilegedUsers(privilegedList)
                .availableBackups(backupFiles)
                .build();
    }

    @Transactional
    public Map<String, Object> previewJsonData(String jsonString) {
        Map<String, Object> preview = new LinkedHashMap<>();
        try {
            JsonNode root = objectMapper.readTree(jsonString);
            JsonNode devNode = root.get("device");
            JsonNode usersNode = root.get("users");
            JsonNode attNode = root.get("attendance");
            JsonNode fpNode = root.get("fingerprints");

            if (devNode != null) {
                Map<String, Object> devMap = new LinkedHashMap<>();
                devMap.put("serial", devNode.path("serial").asText());
                devMap.put("model", devNode.path("model").asText());
                devMap.put("ip", devNode.path("ip").asText());
                preview.put("device", devMap);
            }

            int userCount = usersNode != null && usersNode.isArray() ? usersNode.size() : 0;
            int attCount = attNode != null && attNode.isArray() ? attNode.size() : 0;
            int fpCount = fpNode != null && fpNode.isArray() ? fpNode.size() : 0;

            preview.put("userCount", userCount);
            preview.put("attendanceCount", attCount);
            preview.put("fingerprintCount", fpCount);

            // Role Breakdown
            int adminCount = 0;
            int enrollerCount = 0;
            int normalCount = 0;
            List<Map<String, Object>> privilegedPreview = new ArrayList<>();

            if (usersNode != null && usersNode.isArray()) {
                for (JsonNode u : usersNode) {
                    int priv = u.path("privilege").asInt(0);
                    String pin = u.path("user_id").asText();
                    String name = cleanName(u.path("name").asText());
                    long card = u.path("card").asLong(0);

                    if (priv == 8) {
                        adminCount++;
                        Map<String, Object> map = new LinkedHashMap<>();
                        map.put("pin", pin);
                        map.put("name", name);
                        map.put("role", "ADMIN");
                        map.put("card", card > 0 ? String.valueOf(card) : null);
                        privilegedPreview.add(map);
                    } else if (priv == 6) {
                        enrollerCount++;
                        Map<String, Object> map = new LinkedHashMap<>();
                        map.put("pin", pin);
                        map.put("name", name);
                        map.put("role", "ENROLLER");
                        map.put("card", card > 0 ? String.valueOf(card) : null);
                        privilegedPreview.add(map);
                    } else {
                        normalCount++;
                    }
                }
            }

            preview.put("adminCount", adminCount);
            preview.put("enrollerCount", enrollerCount);
            preview.put("normalUserCount", normalCount);
            preview.put("privilegedUsers", privilegedPreview);

        } catch (Exception ex) {
            log.error("Failed to parse preview JSON: {}", ex.getMessage());
            preview.put("error", ex.getMessage());
        }
        return preview;
    }

    private String cleanName(String raw) {
        if (raw == null || raw.isBlank()) return "Unknown";
        String s = raw.trim();
        if (s.contains(".")) {
            String[] parts = s.split("\\.");
            if (parts.length > 0 && !parts[0].trim().isEmpty()) {
                return parts[0].trim();
            }
        }
        return s;
    }
}

