package com.zkteco.attendance.modules.system;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.zkteco.attendance.common.TimeUtils;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class TelegramNotificationService {

    private final SystemSettingService settingService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(6))
            .build();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomTelegramGroup {
        private String id;
        private String name;
        private String chatId;
        @Builder.Default
        private String target = "ALL"; // ALL, TEACHER, STAFF, STUDENT
        @Builder.Default
        private boolean enabled = true;
    }

    public boolean isEnabled() {
        return "true".equalsIgnoreCase(settingService.getSettingValue("TELEGRAM_ENABLED", "false"));
    }

    public String getBotToken() {
        return settingService.getSettingValue("TELEGRAM_BOT_TOKEN", "").trim();
    }

    public String getTeacherChatId() {
        String val = settingService.getSettingValue("TELEGRAM_TEACHER_CHAT_ID", "").trim();
        return !val.isBlank() ? val : settingService.getSettingValue("TELEGRAM_CHAT_ID", "").trim();
    }

    public boolean isNotifyTeacher() {
        return "true".equalsIgnoreCase(settingService.getSettingValue("TELEGRAM_NOTIFY_TEACHER", "true"));
    }

    public String getStaffChatId() {
        String val = settingService.getSettingValue("TELEGRAM_STAFF_CHAT_ID", "").trim();
        return !val.isBlank() ? val : settingService.getSettingValue("TELEGRAM_CHAT_ID", "").trim();
    }

    public boolean isNotifyStaff() {
        return "true".equalsIgnoreCase(settingService.getSettingValue("TELEGRAM_NOTIFY_STAFF",
                settingService.getSettingValue("TELEGRAM_NOTIFY_EMPLOYEE", "true")));
    }

    public String getStudentChatId() {
        String val = settingService.getSettingValue("TELEGRAM_STUDENT_CHAT_ID", "").trim();
        return !val.isBlank() ? val : settingService.getSettingValue("TELEGRAM_CHAT_ID", "").trim();
    }

    public boolean isNotifyStudent() {
        return "true".equalsIgnoreCase(settingService.getSettingValue("TELEGRAM_NOTIFY_STUDENT", "true"));
    }

    public boolean isNotifyLateOnly() {
        return "true".equalsIgnoreCase(settingService.getSettingValue("TELEGRAM_NOTIFY_LATE_ONLY", "false"));
    }

    public List<CustomTelegramGroup> getCustomGroups() {
        String json = settingService.getSettingValue("TELEGRAM_CUSTOM_GROUPS", "[]");
        if (json == null || json.isBlank() || "[]".equals(json.trim())) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<CustomTelegramGroup>>() {});
        } catch (Exception e) {
            log.error("Failed to parse TELEGRAM_CUSTOM_GROUPS JSON: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    public Map<String, Object> getSettings() {
        Map<String, Object> map = new HashMap<>();
        map.put("enabled", isEnabled());
        map.put("botToken", maskToken(getBotToken()));
        map.put("teacherChatId", getTeacherChatId());
        map.put("notifyTeacher", isNotifyTeacher());
        map.put("staffChatId", getStaffChatId());
        map.put("notifyStaff", isNotifyStaff());
        map.put("studentChatId", getStudentChatId());
        map.put("notifyStudent", isNotifyStudent());
        map.put("notifyLateOnly", isNotifyLateOnly());
        map.put("customGroups", getCustomGroups());

        // Backwards compatibility aliases
        map.put("chatId", getStaffChatId());
        map.put("notifyEmployee", isNotifyStaff());
        return map;
    }

    public void saveSettings(
            boolean enabled,
            String botToken,
            String teacherChatId,
            boolean notifyTeacher,
            String staffChatId,
            boolean notifyStaff,
            String studentChatId,
            boolean notifyStudent,
            boolean notifyLateOnly,
            List<CustomTelegramGroup> customGroups
    ) {
        settingService.updateSetting("TELEGRAM_ENABLED", String.valueOf(enabled), "ADMIN");
        if (botToken != null && !botToken.contains("***") && !botToken.isBlank()) {
            settingService.updateSetting("TELEGRAM_BOT_TOKEN", botToken.trim(), "ADMIN");
        }

        if (teacherChatId != null) {
            settingService.updateSetting("TELEGRAM_TEACHER_CHAT_ID", teacherChatId.trim(), "ADMIN");
        }
        settingService.updateSetting("TELEGRAM_NOTIFY_TEACHER", String.valueOf(notifyTeacher), "ADMIN");

        if (staffChatId != null) {
            settingService.updateSetting("TELEGRAM_STAFF_CHAT_ID", staffChatId.trim(), "ADMIN");
            settingService.updateSetting("TELEGRAM_CHAT_ID", staffChatId.trim(), "ADMIN");
        }
        settingService.updateSetting("TELEGRAM_NOTIFY_STAFF", String.valueOf(notifyStaff), "ADMIN");
        settingService.updateSetting("TELEGRAM_NOTIFY_EMPLOYEE", String.valueOf(notifyStaff), "ADMIN");

        if (studentChatId != null) {
            settingService.updateSetting("TELEGRAM_STUDENT_CHAT_ID", studentChatId.trim(), "ADMIN");
        }
        settingService.updateSetting("TELEGRAM_NOTIFY_STUDENT", String.valueOf(notifyStudent), "ADMIN");
        settingService.updateSetting("TELEGRAM_NOTIFY_LATE_ONLY", String.valueOf(notifyLateOnly), "ADMIN");

        if (customGroups != null) {
            try {
                String json = objectMapper.writeValueAsString(customGroups);
                settingService.updateSetting("TELEGRAM_CUSTOM_GROUPS", json, "ADMIN");
            } catch (Exception e) {
                log.error("Failed to serialize TELEGRAM_CUSTOM_GROUPS: {}", e.getMessage());
            }
        }
    }

    public void saveSettings(
            boolean enabled,
            String botToken,
            String teacherChatId,
            boolean notifyTeacher,
            String staffChatId,
            boolean notifyStaff,
            String studentChatId,
            boolean notifyStudent,
            boolean notifyLateOnly
    ) {
        saveSettings(enabled, botToken, teacherChatId, notifyTeacher, staffChatId, notifyStaff, studentChatId, notifyStudent, notifyLateOnly, null);
    }

    public void saveSettings(boolean enabled, String botToken, String chatId, boolean notifyEmployee, boolean notifyStudent, boolean notifyLateOnly) {
        saveSettings(enabled, botToken, chatId, notifyEmployee, chatId, notifyEmployee, chatId, notifyStudent, notifyLateOnly, null);
    }

    private String maskToken(String token) {
        if (token == null || token.length() < 10) return token != null ? token : "";
        return token.substring(0, 6) + "******" + token.substring(token.length() - 4);
    }

    public CompletableFuture<Boolean> sendRawMessageToChat(String chatId, String text) {
        String token = getBotToken();
        if (token.isBlank() || chatId == null || chatId.isBlank()) {
            log.warn("Telegram bot token or destination chat ID is not configured");
            return CompletableFuture.completedFuture(false);
        }

        return CompletableFuture.supplyAsync(() -> {
            try {
                ObjectNode payload = objectMapper.createObjectNode();
                payload.put("chat_id", chatId.trim());
                payload.put("text", text);
                payload.put("parse_mode", "HTML");
                payload.put("disable_web_page_preview", true);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create("https://api.telegram.org/bot" + token + "/sendMessage"))
                        .header("Content-Type", "application/json")
                        .timeout(Duration.ofSeconds(10))
                        .POST(HttpRequest.BodyPublishers.ofString(payload.toString()))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    log.info("Telegram message dispatched successfully to chat {}", chatId);
                    return true;
                } else {
                    log.error("Telegram API error for chat {} (status {}): {}", chatId, response.statusCode(), response.body());
                    return false;
                }
            } catch (Exception ex) {
                log.error("Failed to send Telegram message to chat {}: {}", chatId, ex.getMessage());
                return false;
            }
        });
    }

    public CompletableFuture<Boolean> sendRawMessage(String text) {
        return sendRawMessageToChat(getStaffChatId(), text);
    }

    public CompletableFuture<Boolean> sendTestMessage(String target) {
        String nowStr = TimeUtils.formatPhnomPenh(Instant.now());
        if ("teacher".equalsIgnoreCase(target)) {
            String msg = """
                    👨‍🏫 <b>Enterprise Attendance System - Teachers Group</b>
                    ✅ <b>Telegram Bot Connected Successfully!</b>
                    ━━━━━━━━━━━━━━━━━━━━━
                    🏢 <b>Channel:</b> ក្រុមគ្រូបង្រៀន & សាស្ត្រាចារ្យ (Faculty & Teachers)
                    🕒 <b>Timestamp:</b> <code>%s</code>
                    🔔 <b>Status:</b> Live teacher punch alerts are active.
                    """.formatted(nowStr);
            return sendRawMessageToChat(getTeacherChatId(), msg);
        } else if ("student".equalsIgnoreCase(target)) {
            String msg = """
                    🎓 <b>Enterprise Attendance System - Students Group</b>
                    ✅ <b>Telegram Bot Connected Successfully!</b>
                    ━━━━━━━━━━━━━━━━━━━━━
                    🏢 <b>Channel:</b> ក្រុមសិស្សានុសិស្ស & អាណាព្យាបាល (Students & Guardians)
                    🕒 <b>Timestamp:</b> <code>%s</code>
                    🔔 <b>Status:</b> Live student attendance alerts are active.
                    """.formatted(nowStr);
            return sendRawMessageToChat(getStudentChatId(), msg);
        } else if ("staff".equalsIgnoreCase(target)) {
            String msg = """
                    💼 <b>Enterprise Attendance System - Staffs Group</b>
                    ✅ <b>Telegram Bot Connected Successfully!</b>
                    ━━━━━━━━━━━━━━━━━━━━━
                    🏢 <b>Channel:</b> ក្រុមបុគ្គលិកទូទៅ (Staff & Administration)
                    🕒 <b>Timestamp:</b> <code>%s</code>
                    🔔 <b>Status:</b> Live staff punch alerts are active.
                    """.formatted(nowStr);
            return sendRawMessageToChat(getStaffChatId(), msg);
        } else if (target != null && !target.isBlank() && !"all".equalsIgnoreCase(target)) {
            // Check custom group by id or name
            List<CustomTelegramGroup> customs = getCustomGroups();
            Optional<CustomTelegramGroup> matched = customs.stream()
                    .filter(g -> target.equalsIgnoreCase(g.getId()) || target.equalsIgnoreCase(g.getName()))
                    .findFirst();

            if (matched.isPresent()) {
                CustomTelegramGroup grp = matched.get();
                String msg = """
                        📢 <b>Enterprise Attendance System - %s</b>
                        ✅ <b>Custom Telegram Alert Connected Successfully!</b>
                        ━━━━━━━━━━━━━━━━━━━━━
                        🏢 <b>Group Name:</b> %s
                        🎯 <b>Target Filter:</b> %s
                        🕒 <b>Timestamp:</b> <code>%s</code>
                        🔔 <b>Status:</b> Real-time punch dispatching is active.
                        """.formatted(
                                escapeHtml(grp.getName()),
                                escapeHtml(grp.getName()),
                                escapeHtml(grp.getTarget()),
                                nowStr
                        );
                return sendRawMessageToChat(grp.getChatId(), msg);
            }
        }

        // Target "all" - test core groups + all enabled custom groups
        List<CompletableFuture<Boolean>> futures = new ArrayList<>();
        if (!getTeacherChatId().isBlank()) futures.add(sendTestMessage("teacher"));
        if (!getStaffChatId().isBlank()) futures.add(sendTestMessage("staff"));
        if (!getStudentChatId().isBlank()) futures.add(sendTestMessage("student"));

        for (CustomTelegramGroup cg : getCustomGroups()) {
            if (cg.isEnabled() && cg.getChatId() != null && !cg.getChatId().isBlank()) {
                futures.add(sendTestMessage(cg.getId()));
            }
        }

        if (futures.isEmpty()) {
            return CompletableFuture.completedFuture(false);
        }

        return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .thenApply(v -> futures.stream().anyMatch(f -> {
                    try {
                        return f.join();
                    } catch (Exception e) {
                        return false;
                    }
                }));
    }

    public CompletableFuture<Boolean> sendTestMessage() {
        return sendTestMessage("all");
    }

    @Async
    public void sendPunchNotification(
            String name,
            String code,
            String personnelType,
            String extraDetail,
            String punchState,
            Instant punchTime,
            String branch,
            String device
    ) {
        if (!isEnabled()) return;

        String pType = personnelType != null ? personnelType.toUpperCase() : "STAFF";
        String targetChatId;
        String headerTitle;
        String categoryBadge;

        if ("TEACHER".equalsIgnoreCase(pType)) {
            if (!isNotifyTeacher()) return;
            targetChatId = getTeacherChatId();
            headerTitle = "👨‍🏫 <b>[TEACHER ATTENDANCE] វត្តមានលោកគ្រូ-អ្នកគ្រូ</b>";
            categoryBadge = "👨‍🏫 គ្រូបង្រៀន (Teacher)";
        } else if ("STUDENT".equalsIgnoreCase(pType)) {
            if (!isNotifyStudent()) return;
            targetChatId = getStudentChatId();
            headerTitle = "🎓 <b>[STUDENT ATTENDANCE] វត្តមានសិស្សានុសិស្ស</b>";
            categoryBadge = "🎓 សិស្ស (Student)";
        } else {
            if (!isNotifyStaff()) return;
            targetChatId = getStaffChatId();
            headerTitle = "💼 <b>[STAFF ATTENDANCE] វត្តមានបុគ្គលិក</b>";
            categoryBadge = "💼 បុគ្គលិក (Staff)";
        }

        String stateStr = punchState != null ? punchState.toUpperCase() : "CHECK_IN";
        String stateText = switch (stateStr) {
            case "CHECK_IN" -> "🟢 ចូល (Check In)";
            case "CHECK_OUT" -> "🔴 ចេញ (Check Out)";
            case "BREAK_OUT" -> "☕ ចេញសម្រាក (Break Out)";
            case "BREAK_IN" -> "💼 ចូលពីសម្រាក (Break In)";
            case "OVERTIME_IN" -> "⏳ ចូលថែមម៉ោង (Overtime In)";
            case "OVERTIME_OUT" -> "🏁 ចេញថែមម៉ោង (Overtime Out)";
            default -> "⚡ " + stateStr;
        };

        StringBuilder sb = new StringBuilder();
        sb.append(headerTitle).append("\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━\n");
        sb.append("👤 <b>ឈ្មោះ (Name):</b> ").append(escapeHtml(name != null ? name : "Unknown")).append("\n");
        sb.append("🆔 <b>កូដសម្គាល់ (Code):</b> <code>").append(escapeHtml(code != null ? code : "N/A")).append("</code>\n");
        sb.append("🏷️ <b>ប្រភេទ (Category):</b> ").append(categoryBadge).append("\n");

        if (extraDetail != null && !extraDetail.isBlank()) {
            sb.append("ℹ️ <b>ព័ត៌មានបន្ថែម:</b> ").append(escapeHtml(extraDetail)).append("\n");
        }

        sb.append("⚡ <b>ស្ថានភាព (State):</b> ").append(stateText).append("\n");
        sb.append("⏰ <b>ពេលវេលា (Time):</b> <code>").append(TimeUtils.formatPhnomPenh(punchTime != null ? punchTime : Instant.now())).append("</code>\n");
        sb.append("📍 <b>សាខា (Branch):</b> ").append(escapeHtml(branch != null ? branch : "Main Branch")).append("\n");
        sb.append("📟 <b>ម៉ាស៊ីន (Device):</b> ").append(escapeHtml(device != null ? device : "ZKTeco Terminal")).append("\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━\n");
        sb.append("🏢 <i>ZKTeco Multi-Branch Smart Biometrics</i>");

        String formattedMessage = sb.toString();

        // 1. Send to core group
        if (targetChatId != null && !targetChatId.isBlank()) {
            sendRawMessageToChat(targetChatId, formattedMessage);
        }

        // 2. Also dispatch to any matching Custom Dynamic Telegram Groups
        List<CustomTelegramGroup> customGroups = getCustomGroups();
        for (CustomTelegramGroup cg : customGroups) {
            if (!cg.isEnabled() || cg.getChatId() == null || cg.getChatId().isBlank()) {
                continue;
            }
            String filter = cg.getTarget() != null ? cg.getTarget().toUpperCase() : "ALL";
            boolean matches = "ALL".equals(filter)
                    || ("TEACHER".equals(filter) && "TEACHER".equals(pType))
                    || ("STUDENT".equals(filter) && "STUDENT".equals(pType))
                    || (("STAFF".equals(filter) || "EMPLOYEE".equals(filter)) && ("STAFF".equals(pType) || "EMPLOYEE".equals(pType)));

            if (matches) {
                sendRawMessageToChat(cg.getChatId(), formattedMessage);
            }
        }
    }

    @Async
    public void sendPunchNotification(
            String name,
            String code,
            String personnelType,
            String punchState,
            Instant punchTime,
            String branch,
            String device
    ) {
        sendPunchNotification(name, code, personnelType, null, punchState, punchTime, branch, device);
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }
}
