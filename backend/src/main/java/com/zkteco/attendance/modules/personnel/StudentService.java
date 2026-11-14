package com.zkteco.attendance.modules.personnel;

import com.zkteco.attendance.common.AppException;
import com.zkteco.attendance.common.ErrorCode;
import com.zkteco.attendance.common.PageResponse;
import com.zkteco.attendance.common.ResourceNotFoundException;
import com.zkteco.attendance.modules.personnel.dto.CreateStudentRequest;
import com.zkteco.attendance.modules.personnel.dto.PromoteStudentsRequest;
import com.zkteco.attendance.modules.personnel.dto.PromoteStudentsResult;
import com.zkteco.attendance.modules.personnel.dto.StudentDto;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;
    private final com.zkteco.attendance.modules.device.TerminalSyncService terminalSyncService;
    private final PersonnelCodeGeneratorService personnelCodeGeneratorService;
    private final com.zkteco.attendance.modules.biometric.FaceBiometricRepository faceBiometricRepository;
    private final com.zkteco.attendance.modules.device.DeviceUserRepository deviceUserRepository;
    private final com.zkteco.attendance.modules.organization.BranchRepository branchRepository;
    private final com.zkteco.attendance.modules.audit.AuditLogService auditLogService;
    private final com.zkteco.attendance.modules.shift.EmployeeScheduleRepository scheduleRepository;
    private final com.zkteco.attendance.modules.shift.ShiftRepository shiftRepository;

    @Transactional(readOnly = true)
    public String getNextStudentCode() {
        return personnelCodeGeneratorService.generateNextUniqueCode();
    }

    @Transactional(readOnly = true)
    public String getNextStudentIdNumber(String year) {
        return personnelCodeGeneratorService.generateNextIdNumber("STUDENT", year);
    }

    @Transactional(readOnly = true)
    public PageResponse<StudentDto> getStudents(String search, String className, String grade, String status, Pageable pageable) {
        return getStudents(search, className, grade, status, null, pageable);
    }

    @Transactional(readOnly = true)
    public PageResponse<StudentDto> getStudents(String search, String className, String grade, String status, Long branchId, Pageable pageable) {
        Specification<Student> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));

            String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
            if (activeTenant != null && !activeTenant.isBlank() && !"all".equalsIgnoreCase(activeTenant)) {
                predicates.add(cb.equal(root.get("companyCode"), activeTenant.trim().toLowerCase()));
            }

            if (branchId != null) {
                predicates.add(cb.equal(root.get("branch").get("id"), branchId));
            }

            if (search != null && !search.trim().isEmpty()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("studentCode")), pattern),
                        cb.like(cb.lower(root.get("idNumber")), pattern),
                        cb.like(cb.lower(root.get("englishName")), pattern),
                        cb.like(cb.lower(root.get("khmerName")), pattern)
                ));
            }

            if (className != null && !className.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("className"), className.trim()));
            }

            if (grade != null && !grade.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("grade"), grade.trim()));
            }

            if (status != null && !status.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("status"), status.trim().toUpperCase()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Student> page = studentRepository.findAll(spec, pageable);
        List<com.zkteco.attendance.modules.shift.EmployeeSchedule> activeSchedules = scheduleRepository.findAllActiveSchedules(java.time.LocalDate.now());
        Map<Long, String> stuShiftMap = new HashMap<>();
        for (com.zkteco.attendance.modules.shift.EmployeeSchedule sch : activeSchedules) {
            if (sch.getStudent() != null && sch.getShift() != null) {
                stuShiftMap.put(sch.getStudent().getId(), sch.getShift().getName());
            }
        }
        List<StudentDto> dtos = page.getContent().stream()
                .map(s -> toDto(s, stuShiftMap.get(s.getId())))
                .collect(Collectors.toList());
        return PageResponse.of(page, dtos);
    }

    @Transactional(readOnly = true)
    public StudentDto getStudentById(Long id) {
        Student s = studentRepository.findById(id)
                .filter(st -> st.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if (!"all".equalsIgnoreCase(activeTenant) && !activeTenant.equalsIgnoreCase(s.getCompanyCode())) {
            throw new ResourceNotFoundException("Student", "id", id);
        }
        return toDto(s);
    }

    @Transactional
    public StudentDto createStudent(CreateStudentRequest request) {
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if ("all".equalsIgnoreCase(activeTenant)) activeTenant = "default";

        String code = request.getStudentCode();
        if (code == null || code.trim().isEmpty()) {
            code = personnelCodeGeneratorService.generateNextUniqueCode();
            while (studentRepository.existsByCompanyCodeAndStudentCodeAndDeletedAtIsNull(activeTenant, code)) {
                try {
                    code = String.valueOf(Long.parseLong(code) + 1);
                } catch (Exception e) {
                    code = personnelCodeGeneratorService.generateNextUniqueCode();
                }
            }
        } else {
            // Enforce purely numeric codes (no letters or special characters)
            code = code.trim().replaceAll("[^0-9]", "");
            if (code.isEmpty()) {
                code = personnelCodeGeneratorService.generateNextUniqueCode();
            }
            if (studentRepository.existsByCompanyCodeAndStudentCodeAndDeletedAtIsNull(activeTenant, code)) {
                throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Student code already exists in your company: " + code);
            }
        }

        com.zkteco.attendance.modules.organization.Branch branch = null;
        if (request.getBranchId() != null) {
            branch = branchRepository.findById(request.getBranchId()).orElse(null);
        } else {
            // Default to first active branch
            branch = branchRepository.findAll().stream().findFirst().orElse(null);
        }

        String idNumber = request.getIdNumber();
        if (idNumber == null || idNumber.trim().isEmpty() || idNumber.trim().matches("^[0-9]{1,4}$") || idNumber.trim().matches("^(?i)FBIS[0-9]{0,2}$")) {
            String yr = (idNumber != null && idNumber.replaceAll("[^0-9]", "").length() >= 2)
                    ? idNumber
                    : request.getAcademicYear();
            idNumber = personnelCodeGeneratorService.generateNextIdNumber("STUDENT", yr);
        } else {
            idNumber = idNumber.trim();
        }

        Student s = Student.builder()
                .studentCode(code)
                .idNumber(idNumber)
                .khmerName(request.getKhmerName())
                .englishName(request.getEnglishName().trim())
                .gender(request.getGender().toUpperCase())
                .className(request.getClassName())
                .grade(request.getGrade())
                .academicYear(request.getAcademicYear())
                .parentContact(request.getParentContact())
                .status(request.getStatus() != null ? request.getStatus().toUpperCase() : "ACTIVE")
                .branch(branch)
                .profileImageUrl(request.getProfileImageUrl())
                .companyCode(activeTenant)
                .build();

        Student saved = studentRepository.save(s);

        if (request.getShiftId() != null) {
            shiftRepository.findById(request.getShiftId()).ifPresent(shift -> {
                com.zkteco.attendance.modules.shift.EmployeeSchedule schedule = com.zkteco.attendance.modules.shift.EmployeeSchedule.builder()
                        .student(saved)
                        .shift(shift)
                        .effectiveFrom(java.time.LocalDate.now())
                        .monday(true).tuesday(true).wednesday(true).thursday(true).friday(true).saturday(false).sunday(false)
                        .build();
                scheduleRepository.save(schedule);
            });
        }

        try {
            terminalSyncService.syncStudent(saved, request.getCardNumber());
        } catch (Exception ex) {
            // Non-blocking log
        }
        auditLogService.record("CREATE_STUDENT", "STUDENT", String.valueOf(saved.getId()),
                "Created student " + saved.getEnglishName() + " (Code: " + saved.getStudentCode() + ", Grade: " + saved.getGrade() + ", Class: " + saved.getClassName() + ")");
        return toDto(saved);
    }

    @Transactional
    public StudentDto updateStudent(Long id, CreateStudentRequest request) {
        Student s = studentRepository.findById(id)
                .filter(st -> st.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));

        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if (!"all".equalsIgnoreCase(activeTenant) && !activeTenant.equalsIgnoreCase(s.getCompanyCode())) {
            throw new ResourceNotFoundException("Student", "id", id);
        }

        if (request.getStudentCode() != null && !request.getStudentCode().trim().isEmpty()) {
            String newCode = request.getStudentCode().trim().replaceAll("[^0-9]", "");
            if (!newCode.isEmpty() && !newCode.equalsIgnoreCase(s.getStudentCode())) {
                String targetComp = s.getCompanyCode() != null ? s.getCompanyCode() : "default";
                if (studentRepository.existsByCompanyCodeAndStudentCodeAndDeletedAtIsNull(targetComp, newCode)) {
                    throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Student code already exists in your company: " + newCode);
                }
                String oldCode = s.getStudentCode();
                s.setStudentCode(newCode);

                // Seamlessly keep FaceBiometrics and Device Users in sync with updated student code
                try {
                    faceBiometricRepository.findByStudentId(s.getId()).ifPresent(fb -> {
                        fb.setDevicePin(newCode);
                        faceBiometricRepository.save(fb);
                    });
                    if (oldCode != null && !oldCode.isBlank()) {
                        faceBiometricRepository.findByDevicePin(oldCode).ifPresent(fb -> {
                            fb.setDevicePin(newCode);
                            faceBiometricRepository.save(fb);
                        });
                        List<com.zkteco.attendance.modules.device.AttendanceDeviceUser> devUsers = deviceUserRepository.findByDevicePin(oldCode);
                        for (com.zkteco.attendance.modules.device.AttendanceDeviceUser du : devUsers) {
                            du.setDevicePin(newCode);
                            deviceUserRepository.save(du);
                        }
                    }
                } catch (Exception syncErr) {
                    // Ignore sync exception if none found
                }
            }
        }

        s.setKhmerName(request.getKhmerName());
        s.setEnglishName(request.getEnglishName().trim());
        s.setGender(request.getGender().toUpperCase());
        s.setClassName(request.getClassName());
        s.setGrade(request.getGrade());
        s.setAcademicYear(request.getAcademicYear());
        s.setParentContact(request.getParentContact());
        if (request.getStatus() != null) s.setStatus(request.getStatus().toUpperCase());
        if (request.getBranchId() != null) s.setBranch(branchRepository.findById(request.getBranchId()).orElse(null));
        if (request.getProfileImageUrl() != null) s.setProfileImageUrl(request.getProfileImageUrl());
        if (request.getIdNumber() != null && !request.getIdNumber().trim().isEmpty()) {
            s.setIdNumber(request.getIdNumber().trim());
        }

        Student saved = studentRepository.save(s);

        if (request.getShiftId() != null) {
            shiftRepository.findById(request.getShiftId()).ifPresent(shift -> {
                com.zkteco.attendance.modules.shift.EmployeeSchedule schedule = com.zkteco.attendance.modules.shift.EmployeeSchedule.builder()
                        .student(saved)
                        .shift(shift)
                        .effectiveFrom(java.time.LocalDate.now())
                        .monday(true).tuesday(true).wednesday(true).thursday(true).friday(true).saturday(false).sunday(false)
                        .build();
                scheduleRepository.save(schedule);
            });
        }

        try {
            terminalSyncService.syncStudent(saved, request.getCardNumber());
        } catch (Exception ex) {
            // Non-blocking log
        }
        auditLogService.record("UPDATE_STUDENT", "STUDENT", String.valueOf(saved.getId()),
                "Updated student " + saved.getEnglishName() + " (Code: " + saved.getStudentCode() + ", Grade: " + saved.getGrade() + ", Class: " + saved.getClassName() + ")");
        return toDto(saved);
    }

    @Transactional
    public StudentDto updateStudentStatus(Long id, String status) {
        Student s = studentRepository.findById(id)
                .filter(st -> st.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));

        s.setStatus(status.toUpperCase().trim());
        Student saved = studentRepository.save(s);

        try {
            terminalSyncService.syncStudent(saved, null);
        } catch (Exception ignored) {}
        auditLogService.record("UPDATE_STUDENT_STATUS", "STUDENT", String.valueOf(saved.getId()),
                "Changed student status to " + status + " for " + saved.getEnglishName() + " (" + saved.getStudentCode() + ")");
        return toDto(saved);
    }

    @Transactional
    public void deleteStudent(Long id) {
        Student s = studentRepository.findById(id)
                .filter(st -> st.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));

        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if (!"all".equalsIgnoreCase(activeTenant) && !activeTenant.equalsIgnoreCase(s.getCompanyCode())) {
            throw new ResourceNotFoundException("Student", "id", id);
        }

        String originalPin = s.getStudentCode();
        s.setDeletedAt(Instant.now());
        s.setStatus("WITHDRAWN");
        if (s.getStudentCode() != null && !s.getStudentCode().contains("_del_")) {
            s.setStudentCode(s.getStudentCode() + "_del_" + s.getId());
        }
        if (s.getIdNumber() != null && !s.getIdNumber().contains("_del_")) {
            s.setIdNumber(s.getIdNumber() + "_del_" + s.getId());
        }
        studentRepository.save(s);
        try {
            scheduleRepository.deleteByStudentId(s.getId());
            deviceUserRepository.deleteByStudentId(s.getId());
            if (originalPin != null && !originalPin.contains("_del_")) {
                terminalSyncService.deleteUserFromPhysicalMachinesAsync(originalPin);
            }
        } catch (Exception ignored) {}
        auditLogService.record("DELETE_STUDENT", "STUDENT", String.valueOf(s.getId()),
                "Withdrawn/deleted student " + s.getEnglishName() + " (" + s.getStudentCode() + ", Company: " + s.getCompanyCode() + ")");
    }

    @Transactional
    public PromoteStudentsResult promoteStudents(PromoteStudentsRequest req) {
        String mode = (req.getMode() != null) ? req.getMode().toUpperCase() : "FULL_ROLLOVER";
        String targetYear = (req.getTargetAcademicYear() != null && !req.getTargetAcademicYear().trim().isEmpty())
                ? req.getTargetAcademicYear().trim()
                : "2027-2028";

        int totalPromoted = 0;
        int totalGraduated = 0;
        Map<String, Integer> breakdown = new LinkedHashMap<>();

        Set<Long> excluded = (req.getExcludedStudentIds() != null)
                ? new HashSet<>(req.getExcludedStudentIds())
                : Collections.emptySet();

        if ("FULL_ROLLOVER".equals(mode)) {
            // Full rollover of active students, excluding any retained/held back students
            List<Student> students = studentRepository.findAll().stream()
                    .filter(s -> s.getDeletedAt() == null && !"WITHDRAWN".equalsIgnoreCase(s.getStatus()) && !"GRADUATED".equalsIgnoreCase(s.getStatus()))
                    .filter(s -> !excluded.contains(s.getId()))
                    .toList();

            for (Student s : students) {
                String currentGrade = s.getGrade();
                if (currentGrade == null) currentGrade = "Kindergarten";

                if (currentGrade.equalsIgnoreCase("Grade 12") || currentGrade.toLowerCase().contains("12")) {
                    // Grade 12 graduates!
                    s.setStatus("GRADUATED");
                    s.setAcademicYear(targetYear);
                    totalGraduated++;
                    breakdown.put("Grade 12 -> Graduated", breakdown.getOrDefault("Grade 12 -> Graduated", 0) + 1);
                } else {
                    String nextGrade = getNextGrade(currentGrade);
                    String nextClass = advanceClassName(s.getClassName(), currentGrade, nextGrade, req.isAutoIncrementClassNumber());

                    s.setGrade(nextGrade);
                    if (nextClass != null) s.setClassName(nextClass);
                    s.setAcademicYear(targetYear);
                    s.setStatus("ACTIVE");
                    totalPromoted++;
                    String label = currentGrade + " -> " + nextGrade;
                    breakdown.put(label, breakdown.getOrDefault(label, 0) + 1);
                }
            }
            studentRepository.saveAll(students);

        } else if ("BY_GRADE".equals(mode)) {
            String srcGrade = req.getSourceGrade();
            String tgtGrade = req.getTargetGrade() != null ? req.getTargetGrade().trim() : "Grade 12";

            List<Student> students = studentRepository.findAll().stream()
                    .filter(s -> s.getDeletedAt() == null && !"WITHDRAWN".equalsIgnoreCase(s.getStatus()))
                    .filter(s -> !excluded.contains(s.getId()))
                    .filter(s -> srcGrade == null || (s.getGrade() != null && s.getGrade().equalsIgnoreCase(srcGrade.trim())))
                    .filter(s -> req.getSourceAcademicYear() == null || (s.getAcademicYear() != null && s.getAcademicYear().equalsIgnoreCase(req.getSourceAcademicYear().trim())))
                    .filter(s -> req.getSourceClassName() == null || (s.getClassName() != null && s.getClassName().equalsIgnoreCase(req.getSourceClassName().trim())))
                    .toList();

            for (Student s : students) {
                if ("GRADUATED".equalsIgnoreCase(tgtGrade) || "GRADUATED".equalsIgnoreCase(req.getNewStatus())) {
                    s.setStatus("GRADUATED");
                    s.setAcademicYear(targetYear);
                    totalGraduated++;
                    breakdown.put(s.getGrade() + " -> Graduated", breakdown.getOrDefault(s.getGrade() + " -> Graduated", 0) + 1);
                } else {
                    String nextClass = (req.getTargetClassName() != null && !req.getTargetClassName().trim().isEmpty())
                            ? req.getTargetClassName().trim()
                            : advanceClassName(s.getClassName(), s.getGrade(), tgtGrade, req.isAutoIncrementClassNumber());

                    s.setGrade(tgtGrade);
                    if (nextClass != null) s.setClassName(nextClass);
                    s.setAcademicYear(targetYear);
                    if (req.getNewStatus() != null && !req.getNewStatus().trim().isEmpty()) {
                        s.setStatus(req.getNewStatus().toUpperCase().trim());
                    }
                    totalPromoted++;
                    String label = (srcGrade != null ? srcGrade : "All") + " -> " + tgtGrade;
                    breakdown.put(label, breakdown.getOrDefault(label, 0) + 1);
                }
            }
            studentRepository.saveAll(students);

        } else if ("SELECTED".equals(mode)) {
            List<Long> ids = req.getStudentIds() != null ? req.getStudentIds() : List.of();
            List<Student> students = studentRepository.findAllById(ids).stream()
                    .filter(s -> s.getDeletedAt() == null)
                    .filter(s -> !excluded.contains(s.getId()))
                    .toList();

            String tgtGrade = req.getTargetGrade() != null ? req.getTargetGrade().trim() : "Grade 12";

            for (Student s : students) {
                if ("GRADUATED".equalsIgnoreCase(tgtGrade) || "GRADUATED".equalsIgnoreCase(req.getNewStatus())) {
                    s.setStatus("GRADUATED");
                    s.setAcademicYear(targetYear);
                    totalGraduated++;
                    breakdown.put(s.getGrade() + " -> Graduated", breakdown.getOrDefault(s.getGrade() + " -> Graduated", 0) + 1);
                } else {
                    String nextClass = (req.getTargetClassName() != null && !req.getTargetClassName().trim().isEmpty())
                            ? req.getTargetClassName().trim()
                            : advanceClassName(s.getClassName(), s.getGrade(), tgtGrade, req.isAutoIncrementClassNumber());

                    s.setGrade(tgtGrade);
                    if (nextClass != null) s.setClassName(nextClass);
                    s.setAcademicYear(targetYear);
                    if (req.getNewStatus() != null) s.setStatus(req.getNewStatus().toUpperCase());
                    totalPromoted++;
                    String label = (s.getGrade() != null ? s.getGrade() : "Selected") + " -> " + tgtGrade;
                    breakdown.put(label, breakdown.getOrDefault(label, 0) + 1);
                }
            }
            studentRepository.saveAll(students);
        }

        int total = totalPromoted + totalGraduated;
        return PromoteStudentsResult.builder()
                .totalProcessed(total)
                .totalPromoted(totalPromoted)
                .totalGraduated(totalGraduated)
                .targetAcademicYear(targetYear)
                .gradeBreakdown(breakdown)
                .message("Successfully rolled over " + total + " students into academic year " + targetYear + " (" + totalPromoted + " promoted, " + totalGraduated + " graduated)")
                .build();
    }

    private String getNextGrade(String grade) {
        if (grade == null) return "Grade 1";
        grade = grade.trim();
        String lower = grade.toLowerCase();
        if (lower.contains("kindergarten") || lower.contains("preschool") || lower.contains("k1") || lower.contains("k2") || lower.contains("k3") || lower.equals("k")) {
            return "Grade 1";
        }
        if (lower.equals("grade 1") || lower.equals("1")) return "Grade 2";
        if (lower.equals("grade 2") || lower.equals("2")) return "Grade 3";
        if (lower.equals("grade 3") || lower.equals("3")) return "Grade 4";
        if (lower.equals("grade 4") || lower.equals("4")) return "Grade 5";
        if (lower.equals("grade 5") || lower.equals("5")) return "Grade 6";
        if (lower.equals("grade 6") || lower.equals("6")) return "Grade 7";
        if (lower.equals("grade 7") || lower.equals("7")) return "Grade 8";
        if (lower.equals("grade 8") || lower.equals("8")) return "Grade 9";
        if (lower.equals("grade 9") || lower.equals("9")) return "Grade 10";
        if (lower.equals("grade 10") || lower.equals("10")) return "Grade 11";
        if (lower.equals("grade 11") || lower.equals("11")) return "Grade 12";
        if (lower.equals("grade 12") || lower.equals("12")) return "GRADUATED";
        return grade;
    }

    private String advanceClassName(String currentClass, String currentGrade, String nextGrade, boolean autoIncrement) {
        if (!autoIncrement || currentClass == null) return currentClass;
        // e.g. Class 1A -> Class 2A, Class 10B -> Class 11B
        Matcher m = Pattern.compile("(\\d+)").matcher(currentClass);
        if (m.find()) {
            try {
                int num = Integer.parseInt(m.group(1));
                if (num >= 1 && num < 12) {
                    return currentClass.replaceFirst(String.valueOf(num), String.valueOf(num + 1));
                }
            } catch (NumberFormatException ignored) {}
        }
        if (currentClass.toLowerCase().contains("kindergarten") || currentClass.toLowerCase().contains("k-")) {
            return currentClass.replaceAll("(?i)kindergarten", "Class 1").replaceAll("(?i)k-", "Class 1-");
        }
        return currentClass;
    }

    public StudentDto toDto(Student s) {
        String shiftName = null;
        if (s != null && s.getId() != null) {
            List<com.zkteco.attendance.modules.shift.EmployeeSchedule> active = scheduleRepository.findActiveStudentSchedules(s.getId(), java.time.LocalDate.now());
            if (!active.isEmpty() && active.get(0).getShift() != null) {
                shiftName = active.get(0).getShift().getName();
            }
        }
        return toDto(s, shiftName);
    }

    public StudentDto toDto(Student s, String shiftName) {
        if (s == null) return null;
        return StudentDto.builder()
                .id(s.getId())
                .studentCode(s.getStudentCode())
                .idNumber(s.getIdNumber())
                .khmerName(s.getKhmerName())
                .englishName(s.getEnglishName())
                .gender(s.getGender())
                .className(s.getClassName())
                .grade(s.getGrade())
                .academicYear(s.getAcademicYear())
                .parentContact(s.getParentContact())
                .status(s.getStatus())
                .branchId(s.getBranch() != null ? s.getBranch().getId() : null)
                .branchName(s.getBranch() != null ? s.getBranch().getName() : null)
                .branchCode(s.getBranch() != null ? s.getBranch().getCode() : null)
                .profileImageUrl(s.getProfileImageUrl())
                .companyCode(s.getCompanyCode())
                .scheduleAssigned(shiftName != null)
                .currentShiftName(shiftName)
                .build();
    }
}

