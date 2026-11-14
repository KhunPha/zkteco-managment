package com.zkteco.attendance.modules.system;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.modules.academic.AcademicService;
import com.zkteco.attendance.modules.academic.dto.AcademicClassDto;
import com.zkteco.attendance.modules.academic.dto.AcademicYearDto;
import com.zkteco.attendance.modules.personnel.StudentRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/telegram")
@RequiredArgsConstructor
@Tag(name = "Telegram Notifications", description = "Telegram Bot integration for real-time punch alerts")
public class TelegramController {

    private final TelegramNotificationService telegramService;
    private final StudentRepository studentRepository;
    private final AcademicService academicService;

    @GetMapping("/settings")
    @PreAuthorize("hasAuthority('settings.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get Telegram Bot notification settings")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSettings() {
        return ResponseEntity.ok(ApiResponse.ok("Telegram settings retrieved", telegramService.getSettings()));
    }

    @GetMapping("/student-classes")
    @PreAuthorize("hasAuthority('settings.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get list of distinct student classes for Telegram assignment from Academic Classes / Academic Year")
    public ResponseEntity<ApiResponse<List<String>>> getStudentClasses(
            @RequestParam(required = false) String academicYear
    ) {
        List<String> classNames = new ArrayList<>();

        if (academicYear != null && !academicYear.isBlank()) {
            List<AcademicClassDto> classes = academicService.getClasses(academicYear.trim(), null);
            classNames = classes.stream()
                    .map(AcademicClassDto::getName)
                    .filter(name -> name != null && !name.isBlank())
                    .distinct()
                    .sorted()
                    .collect(Collectors.toList());
        } else {
            // Find current active academic year first
            List<AcademicYearDto> years = academicService.getAcademicYears();
            String currentYearCode = years.stream()
                    .filter(y -> Boolean.TRUE.equals(y.getIsCurrent()))
                    .map(AcademicYearDto::getCode)
                    .findFirst()
                    .orElseGet(() -> !years.isEmpty() ? years.get(0).getCode() : null);

            if (currentYearCode != null) {
                List<AcademicClassDto> classes = academicService.getClasses(currentYearCode, null);
                classNames = classes.stream()
                        .map(AcademicClassDto::getName)
                        .filter(name -> name != null && !name.isBlank())
                        .distinct()
                        .sorted()
                        .collect(Collectors.toList());
            }
        }

        // Fallback: If no classes in academic structure yet, get from student records
        if (classNames.isEmpty()) {
            classNames = studentRepository.findDistinctClassNames();
        }

        return ResponseEntity.ok(ApiResponse.ok("Student classes retrieved", classNames));
    }

    @PostMapping("/settings")
    @PreAuthorize("hasAuthority('settings.manage') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Save Telegram Bot notification settings")
    public ResponseEntity<ApiResponse<Void>> saveSettings(@RequestBody TelegramSettingsRequest request) {
        // Respect explicit empty string if user cleared the chat ID
        String teacherChat = request.getTeacherChatId() != null
                ? request.getTeacherChatId().trim()
                : (request.getChatId() != null ? request.getChatId().trim() : "");

        String staffChat = request.getStaffChatId() != null
                ? request.getStaffChatId().trim()
                : (request.getChatId() != null ? request.getChatId().trim() : "");

        String studentChat = request.getStudentChatId() != null
                ? request.getStudentChatId().trim()
                : "";

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
                request.getCustomGroups(),
                request.getStudentClassGroups()
        );
        return ResponseEntity.ok(ApiResponse.ok("Telegram settings saved successfully", null));
    }

    @PostMapping("/test")
    @PreAuthorize("hasAuthority('settings.manage') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Send a test notification to configured Telegram Chat / Channel")
    public ResponseEntity<ApiResponse<Boolean>> sendTestMessage(@RequestParam(required = false, defaultValue = "all") String target) {
        boolean sent = telegramService.sendTestMessage(target).join();
        String targetClean = target != null ? target.trim() : "all";
        String groupName = switch (targetClean.toLowerCase()) {
            case "teacher" -> "Teachers Group (ក្រុមគ្រូបង្រៀន)";
            case "staff" -> "Staffs Group (ក្រុមបុគ្គលិក)";
            case "student" -> "Students Group (ក្រុមសិស្សានុសិស្ស)";
            case "all" -> "All Configured Groups";
            default -> targetClean.startsWith("class_")
                    ? "Class Group (" + targetClean.replace("class_", "") + ")"
                    : "Group (" + targetClean + ")";
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
        private java.util.List<TelegramNotificationService.StudentClassTelegramGroup> studentClassGroups;
    }
}
