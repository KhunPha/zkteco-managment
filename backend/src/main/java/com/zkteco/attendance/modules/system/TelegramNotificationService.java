package com.zkteco.attendance.modules.system;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.zkteco.attendance.common.AppException;
import com.zkteco.attendance.common.ErrorCode;
import com.zkteco.attendance.common.TimeUtils;
import com.zkteco.attendance.modules.attendance.AttendanceRecord;
import com.zkteco.attendance.modules.attendance.AttendanceRecordRepository;
import com.zkteco.attendance.modules.personnel.Employee;
import com.zkteco.attendance.modules.personnel.EmployeeRepository;
import com.zkteco.attendance.modules.personnel.Student;
import com.zkteco.attendance.modules.personnel.StudentRepository;
import com.zkteco.attendance.modules.shift.EmployeeSchedule;
import com.zkteco.attendance.modules.shift.EmployeeScheduleRepository;
import com.zkteco.attendance.modules.shift.Shift;
import com.zkteco.attendance.modules.shift.ShiftRepository;
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
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class TelegramNotificationService {

    private final SystemSettingService settingService;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final EmployeeRepository employeeRepository;
    private final StudentRepository studentRepository;
    private final EmployeeScheduleRepository scheduleRepository;
    private final ShiftRepository shiftRepository;

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

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentClassTelegramGroup {
        private String id;
        private String className; // e.g. "Class 8A", "Class 10A"
        private String chatId;    // Telegram Chat ID e.g. -1005316595198
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
        return settingService.getSettingValue("TELEGRAM_TEACHER_CHAT_ID", "").trim();
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
        return settingService.getSettingValue("TELEGRAM_STUDENT_CHAT_ID", "").trim();
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

    public List<StudentClassTelegramGroup> getStudentClassGroups() {
        String json = settingService.getSettingValue("TELEGRAM_STUDENT_CLASS_GROUPS", "[]");
        if (json == null || json.isBlank() || "[]".equals(json.trim())) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<StudentClassTelegramGroup>>() {});
        } catch (Exception e) {
            log.error("Failed to parse TELEGRAM_STUDENT_CLASS_GROUPS JSON: {}", e.getMessage());
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
        map.put("studentClassGroups", getStudentClassGroups());

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
            List<CustomTelegramGroup> customGroups,
            List<StudentClassTelegramGroup> studentClassGroups
    ) {
        settingService.updateSetting("TELEGRAM_ENABLED", String.valueOf(enabled), "ADMIN");
        if (botToken != null && !botToken.contains("***") && !botToken.isBlank()) {
            settingService.updateSetting("TELEGRAM_BOT_TOKEN", botToken.trim(), "ADMIN");
        }

        settingService.updateSetting("TELEGRAM_TEACHER_CHAT_ID", teacherChatId != null ? teacherChatId.trim() : "", "ADMIN");
        settingService.updateSetting("TELEGRAM_NOTIFY_TEACHER", String.valueOf(notifyTeacher), "ADMIN");

        settingService.updateSetting("TELEGRAM_STAFF_CHAT_ID", staffChatId != null ? staffChatId.trim() : "", "ADMIN");
        settingService.updateSetting("TELEGRAM_CHAT_ID", staffChatId != null ? staffChatId.trim() : "", "ADMIN");
        settingService.updateSetting("TELEGRAM_NOTIFY_STAFF", String.valueOf(notifyStaff), "ADMIN");
        settingService.updateSetting("TELEGRAM_NOTIFY_EMPLOYEE", String.valueOf(notifyStaff), "ADMIN");

        settingService.updateSetting("TELEGRAM_STUDENT_CHAT_ID", studentChatId != null ? studentChatId.trim() : "", "ADMIN");
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

        if (studentClassGroups != null) {
            try {
                String json = objectMapper.writeValueAsString(studentClassGroups);
                settingService.updateSetting("TELEGRAM_STUDENT_CLASS_GROUPS", json, "ADMIN");
            } catch (Exception e) {
                log.error("Failed to serialize TELEGRAM_STUDENT_CLASS_GROUPS: {}", e.getMessage());
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
            boolean notifyLateOnly,
            List<CustomTelegramGroup> customGroups
    ) {
        saveSettings(enabled, botToken, teacherChatId, notifyTeacher, staffChatId, notifyStaff, studentChatId, notifyStudent, notifyLateOnly, customGroups, null);
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
            String chatId = getTeacherChatId();
            if (chatId.isBlank()) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Teacher Telegram Chat ID is not configured or removed");
            }
            String msg = """
                    👨‍🏫 <b>[TEACHER ATTENDANCE] វត្តមានលោកគ្រូ-អ្នកគ្រូ (Test)</b>
                    ✅ <b>Telegram Bot Connected Successfully!</b>
                    ━━━━━━━━━━━━━━━━━━━━━
                    👤 <b>ឈ្មោះ (Name):</b> Bal Riksann
                    🆔 <b>កូដសម្គាល់ (Code):</b> <code>1</code>
                    🏷️ <b>ប្រភេទ (Category):</b> 👨‍🏫 គ្រូបង្រៀន (Teacher)
                    ⚡ <b>ស្ថានភាព (State):</b> 🟢 ចូល (Check In)
                    ⏱️ <b>វិន័យម៉ោង (Punctuality):</b> ⚠️ <b>យឺត 15 នាទី (Late +15m)</b>
                    ⏰ <b>ពេលវេលា (Time):</b> <code>%s</code>
                    📍 <b>សាខា (Branch):</b> Phnom Penh Main Campus
                    📟 <b>ម៉ាស៊ីន (Device):</b> ZKTeco Terminal (201)
                    ━━━━━━━━━━━━━━━━━━━━━
                    🔔 <b>Status:</b> Live teacher punch & late/early alerts active.
                    """.formatted(nowStr);
            return sendRawMessageToChat(chatId, msg);
        } else if ("student".equalsIgnoreCase(target)) {
            String chatId = getStudentChatId();
            if (chatId.isBlank()) {
                throw new AppException(ErrorCode.BAD_REQUEST, "General Student Telegram Chat ID is not configured or removed. Use Class Telegram Groups instead.");
            }
            String msg = """
                    🎓 <b>[STUDENT ATTENDANCE] វត្តមានសិស្សានុសិស្ស (Test)</b>
                    ✅ <b>Telegram Bot Connected Successfully!</b>
                    ━━━━━━━━━━━━━━━━━━━━━
                    👤 <b>ឈ្មោះ (Name):</b> Koy Dara
                    🆔 <b>កូដសម្គាល់ (Code):</b> <code>3</code>
                    🏷️ <b>ប្រភេទ (Category):</b> 🎓 សិស្ស (Student)
                    ℹ️ <b>ព័ត៌មានបន្ថែម:</b> ថ្នាក់ (Class): Grade 7 - Class 7A
                    ⚡ <b>ស្ថានភាព (State):</b> 🟢 ចូល (Check In)
                    ⏱️ <b>វិន័យម៉ោង (Punctuality):</b> ✅ <b>ទៀងទាត់ (On Time)</b>
                    ⏰ <b>ពេលវេលា (Time):</b> <code>%s</code>
                    📍 <b>សាខា (Branch):</b> Phnom Penh Main Campus
                    📟 <b>ម៉ាស៊ីន (Device):</b> ZKTeco Terminal (201)
                    ━━━━━━━━━━━━━━━━━━━━━
                    🔔 <b>Status:</b> Live student punch & late/early alerts active.
                    """.formatted(nowStr);
            return sendRawMessageToChat(chatId, msg);
        } else if ("staff".equalsIgnoreCase(target)) {
            String msg = """
                    💼 <b>[STAFF ATTENDANCE] វត្តមានបុគ្គលិក (Test)</b>
                    ✅ <b>Telegram Bot Connected Successfully!</b>
                    ━━━━━━━━━━━━━━━━━━━━━
                    👤 <b>ឈ្មោះ (Name):</b> Lanh Sopha
                    🆔 <b>កូដសម្គាល់ (Code):</b> <code>2</code>
                    🏷️ <b>ប្រភេទ (Category):</b> 💼 បុគ្គលិក (Staff)
                    ℹ️ <b>ព័ត៌មានបន្ថែម:</b> ផ្នែក: Information Technology
                    ⚡ <b>ស្ថានភាព (State):</b> 🟢 ចូល (Check In)
                    ⏱️ <b>វិន័យម៉ោង (Punctuality):</b> ⚠️ <b>យឺត 256 នាទី (Late +256m)</b>
                    ⏰ <b>ពេលវេលា (Time):</b> <code>%s</code>
                    📍 <b>សាខា (Branch):</b> FBIS-2
                    📟 <b>ម៉ាស៊ីន (Device):</b> ZKTeco Terminal (202)
                    ━━━━━━━━━━━━━━━━━━━━━
                    🔔 <b>Status:</b> Live staff punch & late/early alerts active.
                    """.formatted(nowStr);
            return sendRawMessageToChat(getStaffChatId(), msg);
        } else if (target != null && !target.isBlank() && !"all".equalsIgnoreCase(target)) {
            // 1. Check custom group by id or name
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

            // 2. Check student class group by id or className
            List<StudentClassTelegramGroup> classGroups = getStudentClassGroups();
            Optional<StudentClassTelegramGroup> matchedClass = classGroups.stream()
                    .filter(g -> target.equalsIgnoreCase(g.getId())
                            || target.equalsIgnoreCase(g.getClassName())
                            || target.equalsIgnoreCase("class_" + g.getClassName())
                            || target.equalsIgnoreCase("class_" + g.getId()))
                    .findFirst();

            if (matchedClass.isPresent()) {
                StudentClassTelegramGroup grp = matchedClass.get();
                String msg = """
                        🎓 <b>[CLASS ATTENDANCE] វត្តមានសិស្សថ្នាក់ %s (Test)</b>
                        ✅ <b>Class Telegram Group Connected Successfully!</b>
                        ━━━━━━━━━━━━━━━━━━━━━
                        🏫 <b>ថ្នាក់ (Class):</b> %s
                        🕒 <b>កាលបរិច្ឆេទ (Timestamp):</b> <code>%s</code>
                        🔔 <b>Status:</b> Live attendance alerts for %s are active.
                        """.formatted(
                                escapeHtml(grp.getClassName()),
                                escapeHtml(grp.getClassName()),
                                nowStr,
                                escapeHtml(grp.getClassName())
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
        String targetChatId = null;
        String headerTitle;
        String categoryBadge;

        if ("TEACHER".equalsIgnoreCase(pType)) {
            targetChatId = isNotifyTeacher() ? getTeacherChatId() : null;
            headerTitle = "👨‍🏫 <b>[TEACHER ATTENDANCE] វត្តមានលោកគ្រូ-អ្នកគ្រូ</b>";
            categoryBadge = "👨‍🏫 គ្រូបង្រៀន (Teacher)";
        } else if ("STUDENT".equalsIgnoreCase(pType)) {
            targetChatId = isNotifyStudent() ? getStudentChatId() : null;
            headerTitle = "🎓 <b>[STUDENT ATTENDANCE] វត្តមានសិស្សានុសិស្ស</b>";
            categoryBadge = "🎓 សិស្ស (Student)";
        } else {
            targetChatId = isNotifyStaff() ? getStaffChatId() : null;
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

        // Determine punctuality (Late or Early Leave)
        int lateMinutes = 0;
        int earlyLeaveMinutes = 0;
        int overtimeMinutes = 0;

        LocalDate punchDate = TimeUtils.toPhnomPenhLocalDate(punchTime != null ? punchTime : Instant.now());
        LocalTime punchLocalTime = TimeUtils.toPhnomPenhLocalTime(punchTime != null ? punchTime : Instant.now());

        // 1. Try to fetch existing computed AttendanceRecord first (most authoritative)
        AttendanceRecord attRecord = null;
        try {
            if ("STUDENT".equalsIgnoreCase(pType)) {
                Optional<Student> sOpt = studentRepository.findByStudentCodeAndDeletedAtIsNull(code);
                if (sOpt.isPresent()) {
                    attRecord = attendanceRecordRepository.findByStudentIdAndAttendanceDate(sOpt.get().getId(), punchDate).orElse(null);
                }
            } else {
                Optional<Employee> eOpt = employeeRepository.findByEmployeeCodeAndDeletedAtIsNull(code);
                if (eOpt.isPresent()) {
                    attRecord = attendanceRecordRepository.findByEmployeeIdAndAttendanceDate(eOpt.get().getId(), punchDate).orElse(null);
                }
            }
        } catch (Exception ex) {
            log.debug("Note looking up attendance record for Telegram alert: {}", ex.getMessage());
        }

        if (attRecord != null) {
            lateMinutes = attRecord.getLateMinutes();
            earlyLeaveMinutes = attRecord.getEarlyLeaveMinutes();
            overtimeMinutes = attRecord.getOvertimeMinutes();
        }

        // Determine Shift schedule for punctuality checks
        Shift shift = null;
        try {
            if ("STUDENT".equalsIgnoreCase(pType)) {
                Optional<Student> sOpt = studentRepository.findByStudentCodeAndDeletedAtIsNull(code);
                if (sOpt.isPresent()) {
                    List<EmployeeSchedule> scheds = scheduleRepository.findActiveStudentSchedules(sOpt.get().getId(), punchDate);
                    if (!scheds.isEmpty()) shift = scheds.get(0).getShift();
                }
            } else {
                Optional<Employee> eOpt = employeeRepository.findByEmployeeCodeAndDeletedAtIsNull(code);
                if (eOpt.isPresent()) {
                    List<EmployeeSchedule> scheds = scheduleRepository.findActiveSchedules(eOpt.get().getId(), punchDate);
                    if (!scheds.isEmpty()) shift = scheds.get(0).getShift();
                }
            }
        } catch (Exception ex) {
            log.debug("Note looking up schedule for Telegram: {}", ex.getMessage());
        }

        if (shift == null) {
            shift = shiftRepository.findByCode("SHIFT_MORNING")
                    .orElseGet(() -> shiftRepository.findAll().stream().findFirst().orElse(null));
        }

        boolean isCheckIn = "CHECK_IN".equalsIgnoreCase(stateStr) || "BREAK_IN".equalsIgnoreCase(stateStr);
        boolean isCheckOut = "CHECK_OUT".equalsIgnoreCase(stateStr) || "BREAK_OUT".equalsIgnoreCase(stateStr);

        LocalTime breakStart = shift != null && shift.getBreakStart() != null ? shift.getBreakStart() : LocalTime.of(12, 0);
        LocalTime breakEnd = shift != null && shift.getBreakEnd() != null ? shift.getBreakEnd() : LocalTime.of(14, 0);
        LocalTime shiftStart = shift != null && shift.getStartTime() != null ? shift.getStartTime() : LocalTime.of(7, 0);
        LocalTime shiftEnd = shift != null && shift.getEndTime() != null ? shift.getEndTime() : LocalTime.of(17, 0);
        int graceLate = shift != null ? shift.getGraceLateMinutes() : 15;
        int graceEarly = shift != null ? shift.getGraceEarlyLeaveMinutes() : 15;

        // Classify shift phase: Shift 1 vs Shift 2
        boolean isMorningPhase = punchLocalTime.isBefore(breakEnd);
        String detailedState;
        String punctualityText;

        if (isCheckIn) {
            if (isMorningPhase) {
                detailedState = "🌅 ចូលវេនទី១ (Shift 1 In)";
                if (punchLocalTime.isAfter(shiftStart.plusMinutes(graceLate))) {
                    lateMinutes = (int) Duration.between(shiftStart, punchLocalTime).toMinutes();
                    punctualityText = "⚠️ <b>យឺត " + lateMinutes + " នាទី (Shift 1 Late +" + lateMinutes + "m)</b>";
                } else {
                    punctualityText = "✅ <b>ទៀងទាត់ (Shift 1 On Time)</b>";
                }
            } else {
                detailedState = "🌆 ចូលវេនទី២ (Shift 2 In / Resume)";
                if (punchLocalTime.isAfter(breakEnd.plusMinutes(graceLate))) {
                    lateMinutes = (int) Duration.between(breakEnd, punchLocalTime).toMinutes();
                    punctualityText = "⚠️ <b>យឺត " + lateMinutes + " នាទី (Shift 2 Late +" + lateMinutes + "m)</b>";
                } else {
                    punctualityText = "✅ <b>ទៀងទាត់ (Shift 2 On Time)</b>";
                }
            }
        } else if (isCheckOut) {
            if (isMorningPhase && shift != null && shift.getBreakStart() != null) {
                detailedState = "🍱 ចេញសម្រាកវេនទី១ (Shift 1 Lunch Out)";
                if (punchLocalTime.isBefore(breakStart.minusMinutes(graceEarly))) {
                    earlyLeaveMinutes = (int) Duration.between(punchLocalTime, breakStart).toMinutes();
                    punctualityText = "⚠️ <b>ចេញមុន " + earlyLeaveMinutes + " នាទី (Shift 1 Early Leave -" + earlyLeaveMinutes + "m)</b>";
                } else {
                    punctualityText = "🍱 <b>ចេញសម្រាកត្រឹមត្រូវ (Lunch Out)</b>";
                }
            } else {
                detailedState = "🏁 ចេញវេនទី២ (Shift 2 Out / End Day)";
                if (punchLocalTime.isBefore(shiftEnd.minusMinutes(graceEarly))) {
                    earlyLeaveMinutes = (int) Duration.between(punchLocalTime, shiftEnd).toMinutes();
                    punctualityText = "⚠️ <b>ចេញមុន " + earlyLeaveMinutes + " នាទី (Shift 2 Early Leave -" + earlyLeaveMinutes + "m)</b>";
                } else if (punchLocalTime.isAfter(shiftEnd)) {
                    overtimeMinutes = (int) Duration.between(shiftEnd, punchLocalTime).toMinutes();
                    punctualityText = "⏳ <b>ថែមម៉ោង " + overtimeMinutes + " នាទី (Overtime +" + overtimeMinutes + "m)</b>";
                } else {
                    punctualityText = "✅ <b>ទៀងទាត់ (Shift 2 On Time)</b>";
                }
            }
        } else {
            detailedState = "⚡ " + stateStr;
            punctualityText = "✅ <b>ទៀងទាត់ (On Time)</b>";
        }

        // Check if tenant requested only late / early departure notifications
        if (isNotifyLateOnly() && lateMinutes <= 0 && earlyLeaveMinutes <= 0) {
            log.info("Telegram notification skipped for {} ({}): Arrival on time and 'notifyLateOnly' is enabled", name, code);
            return;
        }

        StringBuilder sb = new StringBuilder();
        sb.append(headerTitle).append("\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━\n");
        sb.append("👤 <b>ឈ្មោះ (Name):</b> ").append(escapeHtml(name != null ? name : "Unknown")).append("\n");
        sb.append("🆔 <b>កូដសម្គាល់ (Code):</b> <code>").append(escapeHtml(code != null ? code : "N/A")).append("</code>\n");
        sb.append("🏷️ <b>ប្រភេទ (Category):</b> ").append(categoryBadge).append("\n");

        if (extraDetail != null && !extraDetail.isBlank()) {
            sb.append("ℹ️ <b>ព័ត៌មានបន្ថែម:</b> ").append(escapeHtml(extraDetail)).append("\n");
        }

        sb.append("⚡ <b>ស្ថានភាព (State):</b> ").append(detailedState).append("\n");
        sb.append("⏱️ <b>វិន័យម៉ោង (Punctuality):</b> ").append(punctualityText).append("\n");
        sb.append("⏰ <b>ពេលវេលា (Time):</b> <code>").append(TimeUtils.formatPhnomPenh(punchTime != null ? punchTime : Instant.now())).append("</code>\n");
        sb.append("📍 <b>សាខា (Branch):</b> ").append(escapeHtml(branch != null ? branch : "Main Branch")).append("\n");
        sb.append("📟 <b>ម៉ាស៊ីន (Device):</b> ").append(escapeHtml(device != null ? device : "ZKTeco Terminal")).append("\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━\n");
        sb.append("🏢 <i>ZKTeco Multi-Branch Smart Biometrics</i>");

        String formattedMessage = sb.toString();
        int sentCount = 0;

        // 1. Send to core group
        if (targetChatId != null && !targetChatId.isBlank()) {
            sendRawMessageToChat(targetChatId, formattedMessage);
            sentCount++;
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
                sentCount++;
            }
        }

        // 3. Dispatch to Student Class Telegram Groups (manual class-by-class assignment)
        if ("STUDENT".equalsIgnoreCase(pType)) {
            String studentClass = null;
            try {
                Optional<Student> sOpt = studentRepository.findByStudentCodeAndDeletedAtIsNull(code);
                if (sOpt.isPresent() && sOpt.get().getClassName() != null) {
                    studentClass = sOpt.get().getClassName().trim();
                } else if (extraDetail != null && extraDetail.contains("Class):")) {
                    studentClass = extraDetail.substring(extraDetail.indexOf("Class):") + 7).trim();
                }
            } catch (Exception ex) {
                log.debug("Note looking up student class for Telegram: {}", ex.getMessage());
            }

            if (studentClass != null && !studentClass.isBlank()) {
                List<StudentClassTelegramGroup> classGroups = getStudentClassGroups();
                for (StudentClassTelegramGroup scg : classGroups) {
                    if (scg.isEnabled() && scg.getChatId() != null && !scg.getChatId().isBlank()
                            && scg.getClassName() != null
                            && (scg.getClassName().trim().equalsIgnoreCase(studentClass) ||
                                scg.getClassName().trim().equalsIgnoreCase("Class " + studentClass) ||
                                studentClass.equalsIgnoreCase("Class " + scg.getClassName().trim()))) {
                        sendRawMessageToChat(scg.getChatId(), formattedMessage);
                        sentCount++;
                    }
                }
            }
        }
        log.info("Telegram punch notification for {} ({}): dispatched to {} group(s)", name, code, sentCount);
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
