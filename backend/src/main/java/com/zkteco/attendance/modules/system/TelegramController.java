package com.zkteco.attendance.modules.system;

import com.zkteco.attendance.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/telegram")
@RequiredArgsConstructor
@Tag(name = "Telegram Notifications", description = "Telegram Bot integration for real-time punch alerts")
public class TelegramController {

    private final TelegramNotificationService telegramService;

    @GetMapping("/settings")
    @PreAuthorize("hasAuthority('settings.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get Telegram Bot notification settings")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSettings() {
        return ResponseEntity.ok(ApiResponse.ok("Telegram settings retrieved", telegramService.getSettings()));
    }

    @PostMapping("/settings")
    @PreAuthorize("hasAuthority('settings.manage') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Save Telegram Bot notification settings")
    public ResponseEntity<ApiResponse<Void>> saveSettings(@RequestBody TelegramSettingsRequest request) {
        String teacherChat = request.getTeacherChatId() != null && !request.getTeacherChatId().isBlank()
                ? request.getTeacherChatId() : request.getChatId();
        String staffChat = request.getStaffChatId() != null && !request.getStaffChatId().isBlank()
                ? request.getStaffChatId() : request.getChatId();
        String studentChat = request.getStudentChatId() != null && !request.getStudentChatId().isBlank()
                ? request.getStudentChatId() : request.getChatId();

        boolean notifyStaff = request.isNotifyStaff() || request.isNotifyEmployee();

        telegramService.saveSettings(
                request.isEnabled(),
                request.getBotToken(),
                teacherChat,
                request.isNotifyTeacher(),
                staffChat,
                notifyStaff,
                studentChat,
                request.isNotifyStudent(),
                request.isNotifyLateOnly(),
                request.getCustomGroups()
        );
        return ResponseEntity.ok(ApiResponse.ok("Telegram settings saved successfully", null));
    }

    @PostMapping("/test")
    @PreAuthorize("hasAuthority('settings.manage') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Send a test notification to configured Telegram Chat / Channel")
    public ResponseEntity<ApiResponse<Boolean>> sendTestMessage(@RequestParam(required = false, defaultValue = "all") String target) {
        boolean sent = telegramService.sendTestMessage(target).join();
        String groupName = switch (target.toLowerCase()) {
            case "teacher" -> "Teachers Group (ក្រុមគ្រូបង្រៀន)";
            case "staff" -> "Staffs Group (ក្រុមបុគ្គលិក)";
            case "student" -> "Students Group (ក្រុមសិស្សានុសិស្ស)";
            case "all" -> "All Configured Groups";
            default -> "Custom Group (" + target + ")";
        };
        String msg = sent ? "Telegram test message delivered successfully to " + groupName
                          : "Failed to send message to " + groupName + ". Verify Bot Token and Chat ID.";
        return ResponseEntity.ok(ApiResponse.ok(msg, sent));
    }

    @Data
    public static class TelegramSettingsRequest {
        private boolean enabled;
        private String botToken;
        private String chatId; // Legacy / Fallback
        private String teacherChatId;
        private boolean notifyTeacher = true;
        private String staffChatId;
        private boolean notifyStaff = true;
        private String studentChatId;
        private boolean notifyStudent = true;
        private boolean notifyLateOnly = false;
        private boolean notifyEmployee = true; // Legacy
        private java.util.List<TelegramNotificationService.CustomTelegramGroup> customGroups;
    }
}
