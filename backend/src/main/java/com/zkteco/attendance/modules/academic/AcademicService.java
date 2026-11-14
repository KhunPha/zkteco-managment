package com.zkteco.attendance.modules.academic;

import com.zkteco.attendance.common.AppException;
import com.zkteco.attendance.common.ErrorCode;
import com.zkteco.attendance.common.ResourceNotFoundException;
import com.zkteco.attendance.modules.academic.dto.*;
import com.zkteco.attendance.modules.organization.Branch;
import com.zkteco.attendance.modules.organization.BranchRepository;
import com.zkteco.attendance.modules.personnel.Student;
import com.zkteco.attendance.modules.personnel.StudentRepository;
import com.zkteco.attendance.modules.personnel.dto.StudentDto;
import com.zkteco.attendance.modules.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AcademicService {

    private final AcademicYearRepository academicYearRepository;
    private final AcademicGradeRepository academicGradeRepository;
    private final AcademicClassRepository academicClassRepository;
    private final StudentRepository studentRepository;
    private final BranchRepository branchRepository;

    // =========================================================================
    // 1. ACADEMIC YEARS
    // =========================================================================

    @Transactional(readOnly = true)
    public List<AcademicYearDto> getAcademicYears() {
        String tenant = TenantContext.resolveEffectiveTenant();
        List<AcademicYear> list = "all".equalsIgnoreCase(tenant)
                ? academicYearRepository.findByDeletedAtIsNullOrderByCodeDesc()
                : academicYearRepository.findByCompanyCodeAndDeletedAtIsNullOrderByCodeDesc(tenant);

        return list.stream().map(y -> {
            String company = y.getCompanyCode();
            long grades = "all".equalsIgnoreCase(tenant)
                    ? academicGradeRepository.findByAcademicYearAndDeletedAtIsNullOrderBySequenceOrderAsc(y.getCode()).size()
                    : academicGradeRepository.findByCompanyCodeAndAcademicYearAndDeletedAtIsNullOrderBySequenceOrderAsc(company, y.getCode()).size();

            long classes = "all".equalsIgnoreCase(tenant)
                    ? academicClassRepository.findByAcademicYearAndDeletedAtIsNullOrderByNameAsc(y.getCode()).size()
                    : academicClassRepository.findByCompanyCodeAndAcademicYearAndDeletedAtIsNullOrderByNameAsc(company, y.getCode()).size();

            long students = "all".equalsIgnoreCase(tenant)
                    ? studentRepository.countByAcademicYearAndDeletedAtIsNull(y.getCode())
                    : studentRepository.countByCompanyCodeAndAcademicYearAndDeletedAtIsNull(company, y.getCode());

            return AcademicYearDto.builder()
                    .id(y.getId())
                    .code(y.getCode())
                    .name(y.getName())
                    .khmerName(y.getKhmerName())
                    .startDate(y.getStartDate())
                    .endDate(y.getEndDate())
                    .isCurrent(y.getIsCurrent())
                    .companyCode(y.getCompanyCode())
                    .gradeCount(grades)
                    .classCount(classes)
                    .studentCount(students)
                    .createdAt(y.getCreatedAt())
                    .updatedAt(y.getUpdatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional
    public AcademicYearDto createAcademicYear(CreateAcademicYearRequest request) {
        String tenant = TenantContext.resolveEffectiveTenant();
        if ("all".equalsIgnoreCase(tenant)) tenant = "default";

        String code = request.getCode().trim();
        if (academicYearRepository.existsByCompanyCodeAndCodeAndDeletedAtIsNull(tenant, code)) {
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Academic year already exists: " + code);
        }

        boolean isCurrent = Boolean.TRUE.equals(request.getIsCurrent());
        if (isCurrent) {
            unsetCurrentAcademicYears(tenant);
        }

        String name = request.getName() != null && !request.getName().isBlank()
                ? request.getName().trim()
                : "Academic Year " + code;
        String khmerName = request.getKhmerName() != null && !request.getKhmerName().isBlank()
                ? request.getKhmerName().trim()
                : "ឆ្នាំសិក្សា " + code;

        AcademicYear year = AcademicYear.builder()
                .code(code)
                .name(name)
                .khmerName(khmerName)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .isCurrent(isCurrent)
                .companyCode(tenant)
                .build();

        AcademicYear saved = academicYearRepository.save(year);
        return toYearDto(saved, 0, 0, 0);
    }

    @Transactional
    public AcademicYearDto updateAcademicYear(Long id, CreateAcademicYearRequest request) {
        String tenant = TenantContext.resolveEffectiveTenant();
        AcademicYear year = academicYearRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AcademicYear", "id", id));

        if (!"all".equalsIgnoreCase(tenant) && !tenant.equalsIgnoreCase(year.getCompanyCode())) {
            throw new ResourceNotFoundException("AcademicYear", "id", id);
        }

        if (request.getCode() != null && !request.getCode().isBlank()) {
            year.setCode(request.getCode().trim());
        }
        if (request.getName() != null && !request.getName().isBlank()) {
            year.setName(request.getName().trim());
        }
        if (request.getKhmerName() != null) {
            year.setKhmerName(request.getKhmerName().trim());
        }
        year.setStartDate(request.getStartDate());
        year.setEndDate(request.getEndDate());

        if (Boolean.TRUE.equals(request.getIsCurrent())) {
            unsetCurrentAcademicYears(year.getCompanyCode());
            year.setIsCurrent(true);
        } else if (Boolean.FALSE.equals(request.getIsCurrent())) {
            year.setIsCurrent(false);
        }

        AcademicYear saved = academicYearRepository.save(year);
        long grades = academicGradeRepository.findByCompanyCodeAndAcademicYearAndDeletedAtIsNullOrderBySequenceOrderAsc(saved.getCompanyCode(), saved.getCode()).size();
        long classes = academicClassRepository.findByCompanyCodeAndAcademicYearAndDeletedAtIsNullOrderByNameAsc(saved.getCompanyCode(), saved.getCode()).size();
        long students = studentRepository.countByCompanyCodeAndAcademicYearAndDeletedAtIsNull(saved.getCompanyCode(), saved.getCode());
        return toYearDto(saved, grades, classes, students);
    }

    @Transactional
    public AcademicYearDto setCurrentAcademicYear(Long id) {
        String tenant = TenantContext.resolveEffectiveTenant();
        AcademicYear year = academicYearRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AcademicYear", "id", id));

        if (!"all".equalsIgnoreCase(tenant) && !tenant.equalsIgnoreCase(year.getCompanyCode())) {
            throw new ResourceNotFoundException("AcademicYear", "id", id);
        }

        unsetCurrentAcademicYears(year.getCompanyCode());
        year.setIsCurrent(true);
        AcademicYear saved = academicYearRepository.save(year);

        long grades = academicGradeRepository.findByCompanyCodeAndAcademicYearAndDeletedAtIsNullOrderBySequenceOrderAsc(saved.getCompanyCode(), saved.getCode()).size();
        long classes = academicClassRepository.findByCompanyCodeAndAcademicYearAndDeletedAtIsNullOrderByNameAsc(saved.getCompanyCode(), saved.getCode()).size();
        long students = studentRepository.countByCompanyCodeAndAcademicYearAndDeletedAtIsNull(saved.getCompanyCode(), saved.getCode());
        return toYearDto(saved, grades, classes, students);
    }

    @Transactional
    public void deleteAcademicYear(Long id) {
        String tenant = TenantContext.resolveEffectiveTenant();
        AcademicYear year = academicYearRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AcademicYear", "id", id));

        if (!"all".equalsIgnoreCase(tenant) && !tenant.equalsIgnoreCase(year.getCompanyCode())) {
            throw new ResourceNotFoundException("AcademicYear", "id", id);
        }

        year.setDeletedAt(Instant.now());
        academicYearRepository.save(year);
    }

    private void unsetCurrentAcademicYears(String companyCode) {
        List<AcademicYear> allYears = academicYearRepository.findByCompanyCodeAndDeletedAtIsNullOrderByCodeDesc(companyCode);
        for (AcademicYear y : allYears) {
            if (Boolean.TRUE.equals(y.getIsCurrent())) {
                y.setIsCurrent(false);
                academicYearRepository.save(y);
            }
        }
    }

    // =========================================================================
    // 2. ACADEMIC GRADES (PER ACADEMIC YEAR)
    // =========================================================================

    @Transactional(readOnly = true)
    public List<AcademicGradeDto> getGrades(String academicYear) {
        String tenant = TenantContext.resolveEffectiveTenant();
        List<AcademicGrade> list;

        if (academicYear != null && !academicYear.isBlank()) {
            list = "all".equalsIgnoreCase(tenant)
                    ? academicGradeRepository.findByAcademicYearAndDeletedAtIsNullOrderBySequenceOrderAsc(academicYear.trim())
                    : academicGradeRepository.findByCompanyCodeAndAcademicYearAndDeletedAtIsNullOrderBySequenceOrderAsc(tenant, academicYear.trim());
        } else {
            list = "all".equalsIgnoreCase(tenant)
                    ? academicGradeRepository.findByDeletedAtIsNullOrderBySequenceOrderAsc()
                    : academicGradeRepository.findByCompanyCodeAndDeletedAtIsNullOrderBySequenceOrderAsc(tenant);
        }

        return list.stream().map(g -> {
            String comp = g.getCompanyCode();
            String year = g.getAcademicYear();
            long classCount = "all".equalsIgnoreCase(tenant)
                    ? academicClassRepository.findByAcademicYearAndGradeNameAndDeletedAtIsNullOrderByNameAsc(year, g.getName()).size()
                    : academicClassRepository.findByCompanyCodeAndAcademicYearAndGradeNameAndDeletedAtIsNullOrderByNameAsc(comp, year, g.getName()).size();

            long stuCount = "all".equalsIgnoreCase(tenant)
                    ? studentRepository.countByAcademicYearAndGradeAndDeletedAtIsNull(year, g.getName())
                    : studentRepository.countByCompanyCodeAndAcademicYearAndGradeAndDeletedAtIsNull(comp, year, g.getName());

            return AcademicGradeDto.builder()
                    .id(g.getId())
                    .name(g.getName())
                    .khmerName(g.getKhmerName())
                    .academicYear(g.getAcademicYear())
                    .sequenceOrder(g.getSequenceOrder())
                    .description(g.getDescription())
                    .companyCode(g.getCompanyCode())
                    .classCount(classCount)
                    .studentCount(stuCount)
                    .createdAt(g.getCreatedAt())
                    .updatedAt(g.getUpdatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional
    public AcademicGradeDto createGrade(CreateAcademicGradeRequest request) {
        String tenant = TenantContext.resolveEffectiveTenant();
        if ("all".equalsIgnoreCase(tenant)) tenant = "default";

        String gradeName = request.getName().trim();
        String year = request.getAcademicYear().trim();

        if (academicGradeRepository.existsByCompanyCodeAndAcademicYearAndNameAndDeletedAtIsNull(tenant, year, gradeName)) {
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Grade '" + gradeName + "' already exists in academic year " + year);
        }

        int seq = request.getSequenceOrder() != null ? request.getSequenceOrder() : inferSequenceOrder(gradeName);

        AcademicGrade grade = AcademicGrade.builder()
                .name(gradeName)
                .khmerName(request.getKhmerName() != null ? request.getKhmerName().trim() : gradeName)
                .academicYear(year)
                .sequenceOrder(seq)
                .description(request.getDescription())
                .companyCode(tenant)
                .build();

        AcademicGrade saved = academicGradeRepository.save(grade);
        return toGradeDto(saved, 0, 0);
    }

    @Transactional
    public AcademicGradeDto updateGrade(Long id, CreateAcademicGradeRequest request) {
        String tenant = TenantContext.resolveEffectiveTenant();
        AcademicGrade grade = academicGradeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AcademicGrade", "id", id));

        if (!"all".equalsIgnoreCase(tenant) && !tenant.equalsIgnoreCase(grade.getCompanyCode())) {
            throw new ResourceNotFoundException("AcademicGrade", "id", id);
        }

        String oldName = grade.getName();
        String newName = request.getName() != null && !request.getName().isBlank() ? request.getName().trim() : oldName;
        grade.setName(newName);
        if (request.getKhmerName() != null) grade.setKhmerName(request.getKhmerName().trim());
        if (request.getSequenceOrder() != null) grade.setSequenceOrder(request.getSequenceOrder());
        grade.setDescription(request.getDescription());

        AcademicGrade saved = academicGradeRepository.save(grade);

        // If grade name changed, sync classes
        if (!oldName.equalsIgnoreCase(newName)) {
            List<AcademicClass> classes = academicClassRepository.findByCompanyCodeAndAcademicYearAndGradeNameAndDeletedAtIsNullOrderByNameAsc(saved.getCompanyCode(), saved.getAcademicYear(), oldName);
            for (AcademicClass c : classes) {
                c.setGradeName(newName);
                academicClassRepository.save(c);
            }
        }

        long classCount = academicClassRepository.findByCompanyCodeAndAcademicYearAndGradeNameAndDeletedAtIsNullOrderByNameAsc(saved.getCompanyCode(), saved.getAcademicYear(), saved.getName()).size();
        long stuCount = studentRepository.countByCompanyCodeAndAcademicYearAndGradeAndDeletedAtIsNull(saved.getCompanyCode(), saved.getAcademicYear(), saved.getName());
        return toGradeDto(saved, classCount, stuCount);
    }

    @Transactional
    public void deleteGrade(Long id) {
        String tenant = TenantContext.resolveEffectiveTenant();
        AcademicGrade grade = academicGradeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AcademicGrade", "id", id));

        if (!"all".equalsIgnoreCase(tenant) && !tenant.equalsIgnoreCase(grade.getCompanyCode())) {
            throw new ResourceNotFoundException("AcademicGrade", "id", id);
        }

        grade.setDeletedAt(Instant.now());
        academicGradeRepository.save(grade);
    }

    // =========================================================================
    // 3. ACADEMIC CLASSES (PER ACADEMIC YEAR & GRADE)
    // =========================================================================

    @Transactional(readOnly = true)
    public List<AcademicClassDto> getClasses(String academicYear, String gradeName) {
        String tenant = TenantContext.resolveEffectiveTenant();
        List<AcademicClass> list;

        if (academicYear != null && !academicYear.isBlank() && gradeName != null && !gradeName.isBlank()) {
            list = "all".equalsIgnoreCase(tenant)
                    ? academicClassRepository.findByAcademicYearAndGradeNameAndDeletedAtIsNullOrderByNameAsc(academicYear.trim(), gradeName.trim())
                    : academicClassRepository.findByCompanyCodeAndAcademicYearAndGradeNameAndDeletedAtIsNullOrderByNameAsc(tenant, academicYear.trim(), gradeName.trim());
        } else if (academicYear != null && !academicYear.isBlank()) {
            list = "all".equalsIgnoreCase(tenant)
                    ? academicClassRepository.findByAcademicYearAndDeletedAtIsNullOrderByNameAsc(academicYear.trim())
                    : academicClassRepository.findByCompanyCodeAndAcademicYearAndDeletedAtIsNullOrderByNameAsc(tenant, academicYear.trim());
        } else {
            list = "all".equalsIgnoreCase(tenant)
                    ? academicClassRepository.findByDeletedAtIsNullOrderByNameAsc()
                    : academicClassRepository.findByCompanyCodeAndDeletedAtIsNullOrderByNameAsc(tenant);
        }

        return list.stream().map(c -> {
            String comp = c.getCompanyCode();
            long stuCount = "all".equalsIgnoreCase(tenant)
                    ? studentRepository.countByAcademicYearAndClassNameAndDeletedAtIsNull(c.getAcademicYear(), c.getName())
                    : studentRepository.countByCompanyCodeAndAcademicYearAndClassNameAndDeletedAtIsNull(comp, c.getAcademicYear(), c.getName());

            return toClassDto(c, stuCount);
        }).collect(Collectors.toList());
    }

    @Transactional
    public AcademicClassDto createClass(CreateAcademicClassRequest request) {
        String tenant = TenantContext.resolveEffectiveTenant();
        if ("all".equalsIgnoreCase(tenant)) tenant = "default";

        String className = request.getName().trim();
        String year = request.getAcademicYear().trim();
        String gradeName = request.getGradeName().trim();

        if (academicClassRepository.existsByCompanyCodeAndAcademicYearAndNameAndDeletedAtIsNull(tenant, year, className)) {
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Class '" + className + "' already exists in academic year " + year);
        }

        AcademicGrade grade = null;
        if (request.getGradeId() != null) {
            grade = academicGradeRepository.findById(request.getGradeId()).orElse(null);
        } else {
            grade = academicGradeRepository.findByCompanyCodeAndAcademicYearAndNameAndDeletedAtIsNull(tenant, year, gradeName).orElse(null);
        }

        Branch branch = null;
        if (request.getBranchId() != null) {
            branch = branchRepository.findById(request.getBranchId()).orElse(null);
        }

        AcademicClass academicClass = AcademicClass.builder()
                .name(className)
                .khmerName(request.getKhmerName() != null ? request.getKhmerName().trim() : className)
                .grade(grade)
                .gradeName(gradeName)
                .academicYear(year)
                .roomNumber(request.getRoomNumber())
                .homeroomTeacherId(request.getHomeroomTeacherId())
                .homeroomTeacherName(request.getHomeroomTeacherName())
                .telegramChatId(request.getTelegramChatId())
                .maxStudents(request.getMaxStudents() != null && request.getMaxStudents() > 0 ? request.getMaxStudents() : 40)
                .branch(branch)
                .companyCode(tenant)
                .build();

        AcademicClass saved = academicClassRepository.save(academicClass);
        return toClassDto(saved, 0);
    }

    @Transactional
    public AcademicClassDto updateClass(Long id, CreateAcademicClassRequest request) {
        String tenant = TenantContext.resolveEffectiveTenant();
        AcademicClass c = academicClassRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AcademicClass", "id", id));

        if (!"all".equalsIgnoreCase(tenant) && !tenant.equalsIgnoreCase(c.getCompanyCode())) {
            throw new ResourceNotFoundException("AcademicClass", "id", id);
        }

        if (request.getName() != null && !request.getName().isBlank()) {
            c.setName(request.getName().trim());
        }
        if (request.getKhmerName() != null) {
            c.setKhmerName(request.getKhmerName().trim());
        }
        if (request.getGradeName() != null && !request.getGradeName().isBlank()) {
            c.setGradeName(request.getGradeName().trim());
            AcademicGrade grade = academicGradeRepository.findByCompanyCodeAndAcademicYearAndNameAndDeletedAtIsNull(c.getCompanyCode(), c.getAcademicYear(), request.getGradeName().trim()).orElse(null);
            c.setGrade(grade);
        }
        if (request.getRoomNumber() != null) c.setRoomNumber(request.getRoomNumber().trim());
        if (request.getHomeroomTeacherId() != null) c.setHomeroomTeacherId(request.getHomeroomTeacherId());
        if (request.getHomeroomTeacherName() != null) c.setHomeroomTeacherName(request.getHomeroomTeacherName().trim());
        if (request.getTelegramChatId() != null) c.setTelegramChatId(request.getTelegramChatId().trim());
        if (request.getMaxStudents() != null && request.getMaxStudents() > 0) c.setMaxStudents(request.getMaxStudents());

        if (request.getBranchId() != null) {
            c.setBranch(branchRepository.findById(request.getBranchId()).orElse(null));
        }

        AcademicClass saved = academicClassRepository.save(c);
        long stuCount = studentRepository.countByCompanyCodeAndAcademicYearAndClassNameAndDeletedAtIsNull(saved.getCompanyCode(), saved.getAcademicYear(), saved.getName());
        return toClassDto(saved, stuCount);
    }

    @Transactional
    public void deleteClass(Long id) {
        String tenant = TenantContext.resolveEffectiveTenant();
        AcademicClass c = academicClassRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AcademicClass", "id", id));

        if (!"all".equalsIgnoreCase(tenant) && !tenant.equalsIgnoreCase(c.getCompanyCode())) {
            throw new ResourceNotFoundException("AcademicClass", "id", id);
        }

        c.setDeletedAt(Instant.now());
        academicClassRepository.save(c);
    }

    @Transactional(readOnly = true)
    public List<StudentDto> getClassStudents(Long classId) {
        String tenant = TenantContext.resolveEffectiveTenant();
        AcademicClass c = academicClassRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("AcademicClass", "id", classId));

        if (!"all".equalsIgnoreCase(tenant) && !tenant.equalsIgnoreCase(c.getCompanyCode())) {
            throw new ResourceNotFoundException("AcademicClass", "id", classId);
        }

        List<Student> students = "all".equalsIgnoreCase(tenant)
                ? studentRepository.findByAcademicYearAndClassNameAndDeletedAtIsNullOrderByEnglishNameAsc(c.getAcademicYear(), c.getName())
                : studentRepository.findByCompanyCodeAndAcademicYearAndClassNameAndDeletedAtIsNullOrderByEnglishNameAsc(c.getCompanyCode(), c.getAcademicYear(), c.getName());

        return students.stream().map(s -> StudentDto.builder()
                .id(s.getId())
                .studentCode(s.getStudentCode())
                .idNumber(s.getIdNumber())
                .khmerName(s.getKhmerName())
                .englishName(s.getEnglishName())
                .gender(s.getGender())
                .className(s.getClassName())
                .grade(s.getGrade())
                .academicYear(s.getAcademicYear())
                .status(s.getStatus())
                .parentContact(s.getParentContact())
                .profileImageUrl(s.getProfileImageUrl())
                .build()).collect(Collectors.toList());
    }

    // =========================================================================
    // 4. CLONE / DUPLICATE STRUCTURE (FROM PREVIOUS YEAR)
    // =========================================================================

    @Transactional
    public Map<String, Object> copyAcademicStructure(CopyAcademicStructureRequest request) {
        String tenant = TenantContext.resolveEffectiveTenant();
        if ("all".equalsIgnoreCase(tenant)) tenant = "default";

        String srcYear = request.getSourceAcademicYear().trim();
        String targetYear = request.getTargetAcademicYear().trim();

        // 1. Ensure target academic year exists
        AcademicYear target = academicYearRepository.findByCompanyCodeAndCodeAndDeletedAtIsNull(tenant, targetYear).orElse(null);
        if (target == null) {
            target = academicYearRepository.save(AcademicYear.builder()
                    .code(targetYear)
                    .name("Academic Year " + targetYear)
                    .khmerName("ឆ្នាំសិក្សា " + targetYear)
                    .isCurrent(false)
                    .companyCode(tenant)
                    .build());
        }

        // 2. Clone Grades
        List<AcademicGrade> srcGrades = academicGradeRepository.findByCompanyCodeAndAcademicYearAndDeletedAtIsNullOrderBySequenceOrderAsc(tenant, srcYear);
        Map<String, AcademicGrade> targetGradeMap = new HashMap<>();
        int gradesCreated = 0;

        for (AcademicGrade sg : srcGrades) {
            Optional<AcademicGrade> existingOpt = academicGradeRepository.findByCompanyCodeAndAcademicYearAndNameAndDeletedAtIsNull(tenant, targetYear, sg.getName());
            AcademicGrade tg;
            if (existingOpt.isPresent()) {
                tg = existingOpt.get();
            } else {
                tg = academicGradeRepository.save(AcademicGrade.builder()
                        .name(sg.getName())
                        .khmerName(sg.getKhmerName())
                        .academicYear(targetYear)
                        .sequenceOrder(sg.getSequenceOrder())
                        .description(sg.getDescription())
                        .companyCode(tenant)
                        .build());
                gradesCreated++;
            }
            targetGradeMap.put(tg.getName(), tg);
        }

        // 3. Clone Classes
        List<AcademicClass> srcClasses = academicClassRepository.findByCompanyCodeAndAcademicYearAndDeletedAtIsNullOrderByNameAsc(tenant, srcYear);
        int classesCreated = 0;

        for (AcademicClass sc : srcClasses) {
            Optional<AcademicClass> existingOpt = academicClassRepository.findByCompanyCodeAndAcademicYearAndNameAndDeletedAtIsNull(tenant, targetYear, sc.getName());
            if (existingOpt.isEmpty()) {
                AcademicGrade tg = targetGradeMap.get(sc.getGradeName());
                String chatId = Boolean.TRUE.equals(request.getCopyTelegramChatIds()) ? sc.getTelegramChatId() : null;

                academicClassRepository.save(AcademicClass.builder()
                        .name(sc.getName())
                        .khmerName(sc.getKhmerName())
                        .grade(tg)
                        .gradeName(sc.getGradeName())
                        .academicYear(targetYear)
                        .roomNumber(sc.getRoomNumber())
                        .telegramChatId(chatId)
                        .maxStudents(sc.getMaxStudents())
                        .branch(sc.getBranch())
                        .companyCode(tenant)
                        .build());
                classesCreated++;
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("sourceAcademicYear", srcYear);
        result.put("targetAcademicYear", targetYear);
        result.put("gradesCreated", gradesCreated);
        result.put("classesCreated", classesCreated);
        result.put("message", "Successfully copied " + gradesCreated + " grades and " + classesCreated + " classes to Academic Year " + targetYear);
        return result;
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private int inferSequenceOrder(String gradeName) {
        if (gradeName == null) return 1;
        String lower = gradeName.toLowerCase();
        if (lower.contains("kindergarten") || lower.contains("preschool")) return 0;
        for (int i = 1; i <= 12; i++) {
            if (lower.contains(String.valueOf(i))) return i;
        }
        return 1;
    }

    private AcademicYearDto toYearDto(AcademicYear y, long grades, long classes, long students) {
        return AcademicYearDto.builder()
                .id(y.getId())
                .code(y.getCode())
                .name(y.getName())
                .khmerName(y.getKhmerName())
                .startDate(y.getStartDate())
                .endDate(y.getEndDate())
                .isCurrent(y.getIsCurrent())
                .companyCode(y.getCompanyCode())
                .gradeCount(grades)
                .classCount(classes)
                .studentCount(students)
                .createdAt(y.getCreatedAt())
                .updatedAt(y.getUpdatedAt())
                .build();
    }

    private AcademicGradeDto toGradeDto(AcademicGrade g, long classes, long students) {
        return AcademicGradeDto.builder()
                .id(g.getId())
                .name(g.getName())
                .khmerName(g.getKhmerName())
                .academicYear(g.getAcademicYear())
                .sequenceOrder(g.getSequenceOrder())
                .description(g.getDescription())
                .companyCode(g.getCompanyCode())
                .classCount(classes)
                .studentCount(students)
                .createdAt(g.getCreatedAt())
                .updatedAt(g.getUpdatedAt())
                .build();
    }

    private AcademicClassDto toClassDto(AcademicClass c, long stuCount) {
        return AcademicClassDto.builder()
                .id(c.getId())
                .name(c.getName())
                .khmerName(c.getKhmerName())
                .gradeId(c.getGrade() != null ? c.getGrade().getId() : null)
                .gradeName(c.getGradeName())
                .academicYear(c.getAcademicYear())
                .roomNumber(c.getRoomNumber())
                .homeroomTeacherId(c.getHomeroomTeacherId())
                .homeroomTeacherName(c.getHomeroomTeacherName())
                .telegramChatId(c.getTelegramChatId())
                .maxStudents(c.getMaxStudents())
                .branchId(c.getBranch() != null ? c.getBranch().getId() : null)
                .branchName(c.getBranch() != null ? c.getBranch().getName() : null)
                .companyCode(c.getCompanyCode())
                .studentCount(stuCount)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}

