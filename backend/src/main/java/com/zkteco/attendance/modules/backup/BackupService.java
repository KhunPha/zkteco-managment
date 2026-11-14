package com.zkteco.attendance.modules.backup;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zkteco.attendance.modules.backup.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BackupService {

    private final BackupConfigurationRepository configRepository;
    private final BackupRecordRepository recordRepository;
    private final com.zkteco.attendance.modules.audit.AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${spring.datasource.url:jdbc:postgresql://localhost:5433/zkteco_attendance}")
    private String datasourceUrl;

    @Value("${spring.datasource.username:postgres}")
    private String dbUser;

    @Value("${spring.datasource.password:postgres}")
    private String dbPassword;

    private static final String PYTHON_VENV_PATH = "/home/sophaederson/zkteco-in01a/venv/bin/python3";
    public static final ZoneId APP_ZONE = ZoneId.of("Asia/Phnom_Penh");

    private String getPythonExecutable() {
        if (new File(PYTHON_VENV_PATH).exists()) {
            return PYTHON_VENV_PATH;
        }
        return "python3";
    }

    private File getBackupScriptFile() {
        // Try relative to working directory or user directory
        File script = new File("scripts/backup_manager.py");
        if (script.exists()) return script;
        script = new File("/home/sophaederson/Desktop/Programming/Project/zkteco-managment/scripts/backup_manager.py");
        if (script.exists()) return script;
        throw new IllegalStateException("scripts/backup_manager.py script not found");
    }

    private String parseDbHost() {
        try {
            // jdbc:postgresql://localhost:5433/zkteco_attendance
            String clean = datasourceUrl.replace("jdbc:postgresql://", "");
            int colonIdx = clean.indexOf(":");
            if (colonIdx != -1) {
                return clean.substring(0, colonIdx);
            }
            int slashIdx = clean.indexOf("/");
            if (slashIdx != -1) {
                return clean.substring(0, slashIdx);
            }
        } catch (Exception ignored) {}
        return "localhost";
    }

    private int parseDbPort() {
        try {
            String clean = datasourceUrl.replace("jdbc:postgresql://", "");
            int colonIdx = clean.indexOf(":");
            if (colonIdx != -1) {
                int slashIdx = clean.indexOf("/", colonIdx);
                if (slashIdx != -1) {
                    return Integer.parseInt(clean.substring(colonIdx + 1, slashIdx));
                }
                return Integer.parseInt(clean.substring(colonIdx + 1));
            }
        } catch (Exception ignored) {}
        return 5433;
    }

    private String parseDbName() {
        try {
            String clean = datasourceUrl.replace("jdbc:postgresql://", "");
            int slashIdx = clean.indexOf("/");
            if (slashIdx != -1) {
                int qIdx = clean.indexOf("?", slashIdx);
                if (qIdx != -1) {
                    return clean.substring(slashIdx + 1, qIdx);
                }
                return clean.substring(slashIdx + 1);
            }
        } catch (Exception ignored) {}
        return "zkteco_attendance";
    }

    @Transactional
    public BackupConfigDto getConfig(String companyCode) {
        String code = (companyCode == null || companyCode.isBlank()) ? "default" : companyCode;
        BackupConfiguration config = configRepository.findByCompanyCode(code)
                .orElseGet(() -> configRepository.save(
                        BackupConfiguration.builder()
                                .companyCode(code)
                                .enabled(true)
                                .frequency("DAILY")
                                .backupTime("02:00")
                                .cronExpression("0 0 2 * * *")
                                .retentionDays(30)
                                .includeUploads(false)
                                .gdriveEnabled(false)
                                .build()
                ));
        return toConfigDto(config);
    }

    @Transactional
    public BackupConfigDto updateConfig(String companyCode, UpdateBackupConfigRequest request) {
        String code = (companyCode == null || companyCode.isBlank()) ? "default" : companyCode;
        BackupConfiguration config = configRepository.findByCompanyCode(code)
                .orElseGet(() -> BackupConfiguration.builder().companyCode(code).build());

        config.setEnabled(request.isEnabled());
        if (request.getFrequency() != null) config.setFrequency(request.getFrequency());
        if (request.getCronExpression() != null) config.setCronExpression(request.getCronExpression());
        if (request.getBackupTime() != null) config.setBackupTime(request.getBackupTime());
        if (request.getBackupDayOfWeek() != null) config.setBackupDayOfWeek(request.getBackupDayOfWeek());
        if (request.getRetentionDays() > 0) config.setRetentionDays(request.getRetentionDays());
        config.setIncludeUploads(request.isIncludeUploads());
        config.setGdriveEnabled(request.isGdriveEnabled());
        if (request.getGdriveAuthType() != null) config.setGdriveAuthType(request.getGdriveAuthType());
        if (request.getGdriveClientId() != null) config.setGdriveClientId(request.getGdriveClientId().trim());
        if (request.getGdriveClientSecret() != null && !request.getGdriveClientSecret().isBlank()) {
            config.setGdriveClientSecret(request.getGdriveClientSecret().trim());
        }
        if (request.getGdriveFolderId() != null) config.setGdriveFolderId(request.getGdriveFolderId().trim());

        if (request.getGdriveServiceAccountJson() != null && !request.getGdriveServiceAccountJson().isBlank()) {
            String json = request.getGdriveServiceAccountJson().trim();
            config.setGdriveServiceAccountJson(json);
            try {
                JsonNode root = objectMapper.readTree(json);
                if (root.has("client_email")) {
                    config.setGdriveServiceAccountEmail(root.get("client_email").asText());
                }
            } catch (Exception e) {
                log.warn("Could not parse client_email from service account json: {}", e.getMessage());
            }
        }

        BackupConfiguration saved = configRepository.save(config);
        log.info("Updated backup configuration for company {}", code);
        return toConfigDto(saved);
    }

    @Transactional
    public TestGDriveResponse exchangeOAuthCode(String companyCode, OAuthExchangeRequest request) {
        String code = (companyCode == null || companyCode.isBlank()) ? "default" : companyCode;
        BackupConfiguration config = configRepository.findByCompanyCode(code)
                .orElseGet(() -> BackupConfiguration.builder().companyCode(code).build());

        try {
            File script = getBackupScriptFile();
            List<String> cmd = List.of(
                    getPythonExecutable(),
                    script.getAbsolutePath(),
                    "oauth-exchange",
                    "--client-id", request.getClientId().trim(),
                    "--client-secret", request.getClientSecret().trim(),
                    "--code", request.getCode().trim(),
                    "--redirect-uri", request.getRedirectUri().trim()
            );

            ProcessBuilder pb = new ProcessBuilder(cmd);
            Process proc = pb.start();
            StringBuilder out = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(proc.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) out.append(line);
            }
            int exit = proc.waitFor();
            JsonNode resNode = objectMapper.readTree(out.toString());

            if (exit != 0 || !resNode.path("success").asBoolean(false)) {
                return TestGDriveResponse.builder()
                        .success(false)
                        .error(resNode.path("error").asText("Google OAuth exchange failed"))
                        .build();
            }

            String refreshToken = resNode.path("refresh_token").asText();
            String userEmail = resNode.path("user_email").asText("Personal Google Account");

            config.setGdriveAuthType("OAUTH2");
            config.setGdriveClientId(request.getClientId().trim());
            config.setGdriveClientSecret(request.getClientSecret().trim());
            config.setGdriveRefreshToken(refreshToken);
            config.setGdriveUserEmail(userEmail);
            config.setGdriveEnabled(true);
            if (request.getFolderId() != null && !request.getFolderId().isBlank()) {
                config.setGdriveFolderId(request.getFolderId().trim());
            }

            configRepository.save(config);
            log.info("Google OAuth 2.0 connected successfully for {}: {}", code, userEmail);

            return TestGDriveResponse.builder()
                    .success(true)
                    .clientEmail(userEmail)
                    .message("Successfully connected to Google Drive account (" + userEmail + ")")
                    .build();

        } catch (Exception e) {
            log.error("OAuth exchange failed: {}", e.getMessage(), e);
            return TestGDriveResponse.builder()
                    .success(false)
                    .error(e.getMessage())
                    .build();
        }
    }

    public TestGDriveResponse testGoogleDrive(String companyCode, TestGDriveRequest request) {
        String serviceAccountJson = request.getServiceAccountJson();
        String folderId = request.getFolderId();
        String code = (companyCode == null || companyCode.isBlank()) ? "default" : companyCode;
        Optional<BackupConfiguration> opt = configRepository.findByCompanyCode(code);
        String authType = "SERVICE_ACCOUNT";

        // If credentials not in request, fetch from saved config
        if (serviceAccountJson == null || serviceAccountJson.isBlank()) {
            if (opt.isPresent()) {
                BackupConfiguration cfg = opt.get();
                if (folderId == null || folderId.isBlank()) {
                    folderId = cfg.getGdriveFolderId();
                }
                if ("OAUTH2".equalsIgnoreCase(cfg.getGdriveAuthType()) && cfg.getGdriveRefreshToken() != null) {
                    authType = "OAUTH2";
                    try {
                        serviceAccountJson = objectMapper.writeValueAsString(java.util.Map.of(
                                "type", "oauth2",
                                "client_id", cfg.getGdriveClientId() != null ? cfg.getGdriveClientId() : "",
                                "client_secret", cfg.getGdriveClientSecret() != null ? cfg.getGdriveClientSecret() : "",
                                "refresh_token", cfg.getGdriveRefreshToken(),
                                "user_email", cfg.getGdriveUserEmail() != null ? cfg.getGdriveUserEmail() : ""
                        ));
                    } catch (Exception ignore) {}
                } else if (cfg.getGdriveServiceAccountJson() != null) {
                    serviceAccountJson = cfg.getGdriveServiceAccountJson();
                }
            }
        }

        if (serviceAccountJson == null || serviceAccountJson.isBlank()) {
            return TestGDriveResponse.builder()
                    .success(false)
                    .error("No Google Drive credentials (Service Account or OAuth2) provided or configured")
                    .build();
        }

        try {
            File script = getBackupScriptFile();
            List<String> cmd = new ArrayList<>();
            cmd.add(getPythonExecutable());
            cmd.add(script.getAbsolutePath());
            cmd.add("test-gdrive");
            cmd.add("--credentials-json");
            cmd.add(serviceAccountJson);
            cmd.add("--auth-type");
            cmd.add(authType);
            if (folderId != null && !folderId.isBlank()) {
                cmd.add("--folder-id");
                cmd.add(folderId.trim());
            }

            ProcessBuilder pb = new ProcessBuilder(cmd);
            Process proc = pb.start();
            StringBuilder out = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(proc.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) out.append(line);
            }
            proc.waitFor();

            JsonNode resNode = objectMapper.readTree(out.toString());
            boolean success = resNode.path("success").asBoolean(false);
            return TestGDriveResponse.builder()
                    .success(success)
                    .clientEmail(resNode.path("client_email").asText(null))
                    .folderName(resNode.path("folder_name").asText(null))
                    .message(resNode.path("message").asText(null))
                    .error(resNode.path("error").asText(null))
                    .build();
        } catch (Exception e) {
            log.error("Failed to execute Google Drive test: {}", e.getMessage(), e);
            return TestGDriveResponse.builder()
                    .success(false)
                    .error(e.getMessage())
                    .build();
        }
    }

    public List<BackupRecordDto> listBackups(String companyCode) {
        String code = (companyCode == null || companyCode.isBlank()) ? "default" : companyCode;
        return recordRepository.findByCompanyCodeOrderByCreatedAtDesc(code).stream()
                .map(this::toRecordDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public BackupRecordDto triggerBackup(String companyCode, String backupType) {
        String code = (companyCode == null || companyCode.isBlank()) ? "default" : companyCode;
        BackupConfiguration config = configRepository.findByCompanyCode(code)
                .orElseGet(() -> BackupConfiguration.builder().companyCode(code).build());

        String type = (backupType == null || backupType.isBlank()) ? "MANUAL" : backupType.toUpperCase();

        // Create pending record
        BackupRecord record = BackupRecord.builder()
                .companyCode(code)
                .filename("pending...")
                .filePath("pending...")
                .backupType(type)
                .status("IN_PROGRESS")
                .createdAt(Instant.now())
                .build();
        record = recordRepository.save(record);

        try {
            File script = getBackupScriptFile();
            List<String> cmd = new ArrayList<>();
            cmd.add(getPythonExecutable());
            cmd.add(script.getAbsolutePath());
            cmd.add("dump");
            cmd.add("--host");
            cmd.add(parseDbHost());
            cmd.add("--port");
            cmd.add(String.valueOf(parseDbPort()));
            cmd.add("--user");
            cmd.add(dbUser);
            cmd.add("--password");
            cmd.add(dbPassword);
            cmd.add("--dbname");
            cmd.add(parseDbName());

            ProcessBuilder pb = new ProcessBuilder(cmd);
            Process proc = pb.start();
            StringBuilder out = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(proc.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) out.append(line);
            }
            int exitCode = proc.waitFor();

            JsonNode dumpRes = objectMapper.readTree(out.toString());
            if (exitCode != 0 || !dumpRes.path("success").asBoolean(false)) {
                String error = dumpRes.path("error").asText("Database dump failed");
                record.setStatus("FAILED");
                record.setErrorMessage(error);
                record.setCompletedAt(Instant.now());
                recordRepository.save(record);

                config.setLastRunAt(Instant.now());
                config.setLastStatus("FAILED");
                config.setLastError(error);
                configRepository.save(config);

                return toRecordDto(record);
            }

            // Dump Success
            String filename = dumpRes.path("filename").asText();
            String filepath = dumpRes.path("filepath").asText();
            long size = dumpRes.path("size").asLong(0L);

            record.setFilename(filename);
            record.setFilePath(filepath);
            record.setFileSizeBytes(size);
            record.setStatus("SUCCESS");
            record.setCompletedAt(Instant.now());

            // Upload to Google Drive if configured and enabled
            String credJson = null;
            String authType = config.getGdriveAuthType() != null ? config.getGdriveAuthType() : "SERVICE_ACCOUNT";

            if ("OAUTH2".equalsIgnoreCase(authType) && config.getGdriveRefreshToken() != null && !config.getGdriveRefreshToken().isBlank()) {
                try {
                    credJson = objectMapper.writeValueAsString(java.util.Map.of(
                            "type", "oauth2",
                            "client_id", config.getGdriveClientId() != null ? config.getGdriveClientId() : "",
                            "client_secret", config.getGdriveClientSecret() != null ? config.getGdriveClientSecret() : "",
                            "refresh_token", config.getGdriveRefreshToken(),
                            "user_email", config.getGdriveUserEmail() != null ? config.getGdriveUserEmail() : ""
                    ));
                } catch (Exception ignore) {}
            } else if (config.getGdriveServiceAccountJson() != null && !config.getGdriveServiceAccountJson().isBlank()) {
                credJson = config.getGdriveServiceAccountJson();
            }

            if (config.isGdriveEnabled() && credJson != null) {
                record.setGdriveStatus("PENDING");
                try {
                    List<String> upCmd = new ArrayList<>();
                    upCmd.add(getPythonExecutable());
                    upCmd.add(script.getAbsolutePath());
                    upCmd.add("upload");
                    upCmd.add("--filepath");
                    upCmd.add(filepath);
                    upCmd.add("--credentials-json");
                    upCmd.add(credJson);
                    upCmd.add("--auth-type");
                    upCmd.add(authType);
                    if (config.getGdriveFolderId() != null && !config.getGdriveFolderId().isBlank()) {
                        upCmd.add("--folder-id");
                        upCmd.add(config.getGdriveFolderId().trim());
                    }

                    ProcessBuilder upPb = new ProcessBuilder(upCmd);
                    Process upProc = upPb.start();
                    StringBuilder upOut = new StringBuilder();
                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(upProc.getInputStream(), StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = reader.readLine()) != null) upOut.append(line);
                    }
                    int upExit = upProc.waitFor();
                    JsonNode upRes = objectMapper.readTree(upOut.toString());

                    if (upExit == 0 && upRes.path("success").asBoolean(false)) {
                        record.setGdriveStatus("UPLOADED");
                        record.setGdriveFileId(upRes.path("file_id").asText(null));
                        record.setGdriveWebViewLink(upRes.path("web_view_link").asText(null));
                    } else {
                        record.setGdriveStatus("FAILED");
                        record.setGdriveError(upRes.path("error").asText("Google Drive upload error"));
                    }
                } catch (Exception gEx) {
                    log.error("Google Drive upload exception: {}", gEx.getMessage());
                    record.setGdriveStatus("FAILED");
                    record.setGdriveError(gEx.getMessage());
                }
            } else {
                record.setGdriveStatus("NOT_CONFIGURED");
            }

            recordRepository.save(record);

            // Prune local backups
            try {
                int retention = config.getRetentionDays() > 0 ? config.getRetentionDays() : 30;
                List<String> pruneCmd = List.of(getPythonExecutable(), script.getAbsolutePath(), "prune", "--days", String.valueOf(retention));
                new ProcessBuilder(pruneCmd).start();
            } catch (Exception ignore) {}

            config.setLastRunAt(Instant.now());
            config.setLastStatus("SUCCESS");
            config.setLastError(null);
            configRepository.save(config);

            log.info("Backup successfully completed: {} ({} bytes, GDrive: {})", filename, size, record.getGdriveStatus());
            auditLogService.record("CREATE_BACKUP", "BACKUP", String.valueOf(record.getId()),
                    "Created " + type + " backup: " + filename + " (" + (size / 1024) + " KB, GDrive: " + record.getGdriveStatus() + ", Company: " + code + ")");
            return toRecordDto(record);

        } catch (Exception e) {
            log.error("Fatal backup failure: {}", e.getMessage(), e);
            record.setStatus("FAILED");
            record.setErrorMessage(e.getMessage());
            record.setCompletedAt(Instant.now());
            recordRepository.save(record);

            config.setLastRunAt(Instant.now());
            config.setLastStatus("FAILED");
            config.setLastError(e.getMessage());
            configRepository.save(config);

            return toRecordDto(record);
        }
    }

    public Resource getBackupDownloadResource(Long id, String companyCode) {
        BackupRecord record = recordRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Backup record not found: " + id));

        File file = new File(record.getFilePath());
        if (!file.exists()) {
            throw new IllegalStateException("Backup file no longer exists on disk: " + record.getFilename());
        }
        return new FileSystemResource(file);
    }

    public String getBackupFilename(Long id) {
        return recordRepository.findById(id)
                .map(BackupRecord::getFilename)
                .orElse("backup.sql.gz");
    }

    @Transactional
    public void deleteBackup(Long id, String companyCode) {
        BackupRecord record = recordRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Backup record not found: " + id));

        try {
            File file = new File(record.getFilePath());
            if (file.exists()) {
                file.delete();
            }
        } catch (Exception e) {
            log.warn("Could not delete backup file from disk: {}", e.getMessage());
        }

        recordRepository.delete(record);
        auditLogService.record("DELETE_BACKUP", "BACKUP", String.valueOf(id),
                "Deleted backup: " + record.getFilename() + " (Company: " + companyCode + ")");
        log.info("Deleted backup record: {}", id);
    }

    /**
     * Automated Schedule Runner - Evaluates active schedules every minute
     */
    @Scheduled(cron = "0 * * * * *")
    public void runScheduledBackups() {
        List<BackupConfiguration> configs = configRepository.findAll();
        LocalTime nowTime = LocalTime.now(APP_ZONE);
        LocalDate today = LocalDate.now(APP_ZONE);
        DayOfWeek currentDay = today.getDayOfWeek();
        String currentHHmm = nowTime.format(DateTimeFormatter.ofPattern("HH:mm"));

        for (BackupConfiguration config : configs) {
            if (!config.isEnabled()) continue;

            boolean isDue = false;
            String freq = (config.getFrequency() != null) ? config.getFrequency().toUpperCase() : "DAILY";

            if ("HOURLY".equals(freq)) {
                // If never run or ran more than 58 minutes ago
                if (config.getLastRunAt() == null || Duration.between(config.getLastRunAt(), Instant.now()).toMinutes() >= 59) {
                    isDue = true;
                }
            } else if ("DAILY".equals(freq)) {
                String targetTime = (config.getBackupTime() != null) ? config.getBackupTime() : "02:00";
                log.info("Checking DAILY backup schedule: current={} [Zone: {}], target={}, enabled={}", currentHHmm, APP_ZONE.getId(), targetTime, config.isEnabled());
                if (currentHHmm.equals(targetTime)) {
                    Instant startOfDay = today.atStartOfDay(APP_ZONE).toInstant();
                    boolean alreadyScheduledToday = recordRepository.existsByCompanyCodeAndBackupTypeAndCreatedAtAfter(
                            config.getCompanyCode(), "SCHEDULED", startOfDay
                    );
                    if (!alreadyScheduledToday) {
                        isDue = true;
                    } else {
                        log.info("Scheduled DAILY backup for {} already executed today ({})", config.getCompanyCode(), today);
                    }
                }
            } else if ("WEEKLY".equals(freq)) {
                String targetDay = (config.getBackupDayOfWeek() != null) ? config.getBackupDayOfWeek().toUpperCase() : "MONDAY";
                String targetTime = (config.getBackupTime() != null) ? config.getBackupTime() : "02:00";

                if (currentDay.name().equals(targetDay) && currentHHmm.equals(targetTime)) {
                    Instant startOfDay = today.atStartOfDay(APP_ZONE).toInstant();
                    boolean alreadyScheduledToday = recordRepository.existsByCompanyCodeAndBackupTypeAndCreatedAtAfter(
                            config.getCompanyCode(), "SCHEDULED", startOfDay
                    );
                    if (!alreadyScheduledToday) {
                        isDue = true;
                    }
                }
            } else if ("CUSTOM".equals(freq) && config.getCronExpression() != null) {
                try {
                    CronExpression expr = CronExpression.parse(config.getCronExpression());
                    ZonedDateTime next = expr.next(ZonedDateTime.now(APP_ZONE).minusSeconds(60));
                    if (next != null && Duration.between(next, ZonedDateTime.now(APP_ZONE)).abs().getSeconds() < 60) {
                        isDue = true;
                    }
                } catch (Exception e) {
                    log.warn("Invalid cron expression {}: {}", config.getCronExpression(), e.getMessage());
                }
            }

            if (isDue) {
                log.info("Executing scheduled database backup for company: {}", config.getCompanyCode());
                try {
                    triggerBackup(config.getCompanyCode(), "SCHEDULED");
                } catch (Exception e) {
                    log.error("Scheduled backup failed for company {}: {}", config.getCompanyCode(), e.getMessage());
                }
            }
        }
    }

    private BackupConfigDto toConfigDto(BackupConfiguration config) {
        return BackupConfigDto.builder()
                .id(config.getId())
                .companyCode(config.getCompanyCode())
                .enabled(config.isEnabled())
                .frequency(config.getFrequency())
                .cronExpression(config.getCronExpression())
                .backupTime(config.getBackupTime())
                .backupDayOfWeek(config.getBackupDayOfWeek())
                .retentionDays(config.getRetentionDays())
                .includeUploads(config.isIncludeUploads())
                .gdriveEnabled(config.isGdriveEnabled())
                .gdriveFolderId(config.getGdriveFolderId())
                .gdriveAuthType(config.getGdriveAuthType())
                .gdriveClientId(config.getGdriveClientId())
                .gdriveUserEmail(config.getGdriveUserEmail())
                .hasOAuthRefreshToken(config.getGdriveRefreshToken() != null && !config.getGdriveRefreshToken().isBlank())
                .gdriveServiceAccountEmail(config.getGdriveServiceAccountEmail())
                .hasServiceAccountJson(config.getGdriveServiceAccountJson() != null && !config.getGdriveServiceAccountJson().isBlank())
                .lastRunAt(config.getLastRunAt())
                .lastStatus(config.getLastStatus())
                .lastError(config.getLastError())
                .build();
    }

    private BackupRecordDto toRecordDto(BackupRecord record) {
        return BackupRecordDto.builder()
                .id(record.getId())
                .companyCode(record.getCompanyCode())
                .filename(record.getFilename())
                .fileSizeBytes(record.getFileSizeBytes())
                .formattedSize(formatFileSize(record.getFileSizeBytes()))
                .backupType(record.getBackupType())
                .status(record.getStatus())
                .errorMessage(record.getErrorMessage())
                .gdriveFileId(record.getGdriveFileId())
                .gdriveWebViewLink(record.getGdriveWebViewLink())
                .gdriveStatus(record.getGdriveStatus())
                .gdriveError(record.getGdriveError())
                .createdAt(record.getCreatedAt())
                .completedAt(record.getCompletedAt())
                .build();
    }

    private String formatFileSize(Long bytes) {
        if (bytes == null || bytes <= 0) return "0 B";
        final String[] units = new String[]{"B", "KB", "MB", "GB", "TB"};
        int digitGroups = (int) (Math.log10(bytes) / Math.log10(1024));
        return String.format("%.1f %s", bytes / Math.pow(1024, digitGroups), units[digitGroups]);
    }
}

