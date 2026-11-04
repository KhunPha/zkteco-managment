package com.zkteco.attendance.modules.mis;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.common.AppException;
import com.zkteco.attendance.common.ErrorCode;
import com.zkteco.attendance.modules.organization.Department;
import com.zkteco.attendance.modules.organization.DepartmentRepository;
import com.zkteco.attendance.modules.personnel.Employee;
import com.zkteco.attendance.modules.personnel.EmployeeRepository;
import com.zkteco.attendance.modules.personnel.Student;
import com.zkteco.attendance.modules.personnel.StudentRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Data
class MisSyncPayload {
    private List<MisTeacherDto> teachers;
    private List<MisStudentDto> students;
}

@Data
class MisTeacherDto {
    private String teacherCode;
    private String englishName;
    private String khmerName;
    private String email;
    private String phone;
    private String departmentCode;
}

@Data
class MisStudentDto {
    private String studentCode;
    private String englishName;
    private String khmerName;
    private String gender;
    private String className;
    private String grade;
    private String academicYear;
}

@Slf4j
@Service
@RequiredArgsConstructor
class SchoolMisIntegrationService {

    private final EmployeeRepository employeeRepository;
    private final StudentRepository studentRepository;
    private final DepartmentRepository departmentRepository;

    @Transactional
    public String syncPersonnelFromMis(MisSyncPayload payload) {
        int teachersSynced = 0;
        int studentsSynced = 0;

        if (payload.getTeachers() != null) {
            Department academicDept = departmentRepository.findByCode("ACAD")
                    .orElseGet(() -> departmentRepository.findAll().stream().findFirst().orElse(null));

            for (MisTeacherDto t : payload.getTeachers()) {
                Employee emp = employeeRepository.findByEmployeeCodeAndDeletedAtIsNull(t.getTeacherCode())
                        .orElseGet(() -> Employee.builder()
                                .employeeCode(t.getTeacherCode().trim().toUpperCase())
                                .employmentStartDate(LocalDate.now())
                                .gender("OTHER")
                                .employmentType("FULL_TIME")
                                .employmentStatus("ACTIVE")
                                .department(academicDept)
                                .build());

                emp.setEnglishName(t.getEnglishName());
                emp.setKhmerName(t.getKhmerName());
                emp.setEmail(t.getEmail());
                emp.setPhoneNumber(t.getPhone());
                employeeRepository.save(emp);
                teachersSynced++;
            }
        }

        if (payload.getStudents() != null) {
            for (MisStudentDto s : payload.getStudents()) {
                Student student = studentRepository.findByStudentCodeAndDeletedAtIsNull(s.getStudentCode())
                        .orElseGet(() -> Student.builder()
                                .studentCode(s.getStudentCode().trim().toUpperCase())
                                .status("ACTIVE")
                                .build());

                student.setEnglishName(s.getEnglishName());
                student.setKhmerName(s.getKhmerName());
                student.setGender(s.getGender() != null ? s.getGender().toUpperCase() : "MALE");
                student.setClassName(s.getClassName());
                student.setGrade(s.getGrade());
                student.setAcademicYear(s.getAcademicYear());
                studentRepository.save(student);
                studentsSynced++;
            }
        }

        return String.format("MIS Sync completed successfully: %d teachers, %d students processed", teachersSynced, studentsSynced);
    }
}

@Slf4j
@RestController
@RequestMapping("/api/v1/mis/webhook")
@RequiredArgsConstructor
@Tag(name = "School MIS Integration", description = "Webhooks and API synchronization for external Student & Personnel MIS")
public class MisWebhookController {

    private final SchoolMisIntegrationService misService;

    @Value("${app.mis.api-key:mis-secret-api-key-enterprise-2026}")
    private String expectedApiKey;

    @PostMapping("/sync-personnel")
    @Operation(summary = "Webhook endpoint for MIS staff and student synchronization")
    public ResponseEntity<ApiResponse<String>> syncPersonnel(
            @RequestHeader(name = "X-MIS-API-KEY", required = false) String apiKey,
            @RequestBody MisSyncPayload payload) {

        if (apiKey == null || !apiKey.equals(expectedApiKey)) {
            throw new AppException(ErrorCode.ACCESS_DENIED, "Invalid or missing X-MIS-API-KEY header");
        }

        String result = misService.syncPersonnelFromMis(payload);
        return ResponseEntity.ok(ApiResponse.ok("Sync accepted", result));
    }
}

