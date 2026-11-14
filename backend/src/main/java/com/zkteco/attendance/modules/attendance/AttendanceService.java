package com.zkteco.attendance.modules.attendance;

import com.zkteco.attendance.common.AppException;
import com.zkteco.attendance.common.ErrorCode;
import com.zkteco.attendance.common.PageResponse;
import com.zkteco.attendance.common.ResourceNotFoundException;
import com.zkteco.attendance.common.TimeUtils;
import java.time.Duration;
import java.time.LocalTime;
import com.zkteco.attendance.modules.attendance.dto.AttendanceRecordDto;
import com.zkteco.attendance.modules.attendance.dto.LiveScanEventDto;
import com.zkteco.attendance.modules.attendance.dto.ManualAttendanceRequest;
import com.zkteco.attendance.modules.biometric.FaceBiometric;
import com.zkteco.attendance.modules.biometric.FaceBiometricRepository;
import com.zkteco.attendance.modules.device.AttendanceDeviceUser;
import com.zkteco.attendance.modules.device.DeviceUserRepository;
import com.zkteco.attendance.modules.personnel.Employee;
import com.zkteco.attendance.modules.personnel.EmployeeRepository;
import com.zkteco.attendance.modules.personnel.Student;
import com.zkteco.attendance.modules.personnel.StudentRepository;
import com.zkteco.attendance.modules.shift.Shift;
import com.zkteco.attendance.modules.shift.ShiftRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceRecordRepository recordRepository;
    private final AttendanceRawLogRepository rawLogRepository;
    private final AttendanceCalculationEngine calculationEngine;
    private final EmployeeRepository employeeRepository;
    private final ShiftRepository shiftRepository;
    private final StudentRepository studentRepository;
    private final DeviceUserRepository deviceUserRepository;
    private final FaceBiometricRepository faceBiometricRepository;

    public static class TenantSseSubscription {
        final org.springframework.web.servlet.mvc.method.annotation.SseEmitter emitter;
        final String companyCode;

        public TenantSseSubscription(org.springframework.web.servlet.mvc.method.annotation.SseEmitter emitter, String companyCode) {
            this.emitter = emitter;
            this.companyCode = companyCode;
        }
    }

    private final List<TenantSseSubscription> sseSubscriptions = new java.util.concurrent.CopyOnWriteArrayList<>();
    private final Map<String, LiveScanEventDto> personnelCache = new java.util.concurrent.ConcurrentHashMap<>();

    @org.springframework.context.event.EventListener
    public void onRawPunch(com.zkteco.attendance.modules.attendance.event.RawPunchEvent event) {
        broadcastLiveScan(event.getRawLog());
    }

    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter subscribeToLiveScans() {
        return subscribeToLiveScans(null);
    }

    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter subscribeToLiveScans(String explicitCompanyCode) {
        String activeTenant = (explicitCompanyCode != null && !explicitCompanyCode.isBlank())
                ? explicitCompanyCode.trim()
                : com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();

        org.springframework.web.servlet.mvc.method.annotation.SseEmitter emitter = new org.springframework.web.servlet.mvc.method.annotation.SseEmitter(300_000L);
        TenantSseSubscription sub = new TenantSseSubscription(emitter, activeTenant);
        sseSubscriptions.add(sub);
        emitter.onCompletion(() -> sseSubscriptions.remove(sub));
        emitter.onTimeout(() -> sseSubscriptions.remove(sub));
        emitter.onError((e) -> sseSubscriptions.remove(sub));

        try {
            Pageable pageable = PageRequest.of(0, 1);
            Page<AttendanceRawLog> latest;
            if (activeTenant == null || "all".equalsIgnoreCase(activeTenant)) {
                latest = rawLogRepository.findAllByOrderByPunchTimeDesc(pageable);
            } else {
                latest = rawLogRepository.findByCompanyCodeOrderByPunchTimeDesc(activeTenant, pageable);
            }
            if (!latest.isEmpty()) {
                LiveScanEventDto dto = toLiveScanEventDto(latest.getContent().get(0));
                emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event().name("init").data(dto));
            }
        } catch (Exception ignored) {}

        return emitter;
    }

    public void broadcastLiveScan(AttendanceRawLog rawLog) {
        if (rawLog == null || sseSubscriptions.isEmpty()) return;
        try {
            LiveScanEventDto dto = toLiveScanEventDto(rawLog);
            String logCompany = rawLog.getCompanyCode() != null ? rawLog.getCompanyCode() : dto.getCompanyCode();
            if (logCompany == null) logCompany = "default";

            List<TenantSseSubscription> deadSubs = new ArrayList<>();
            for (TenantSseSubscription sub : sseSubscriptions) {
                try {
                    // Strictly isolate: Deliver ONLY if subscription is for "all" or matches punch company
                    if (sub.companyCode == null || "all".equalsIgnoreCase(sub.companyCode) || sub.companyCode.equalsIgnoreCase(logCompany)) {
                        sub.emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                                .name("punch")
                                .data(dto));
                    }
                } catch (Exception e) {
                    deadSubs.add(sub);
                }
            }
            sseSubscriptions.removeAll(deadSubs);
        } catch (Exception ex) {
            log.warn("Failed to broadcast live scan via SSE: {}", ex.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public PageResponse<AttendanceRecordDto> getAttendanceRecords(
            LocalDate date,
            LocalDate startDate,
            LocalDate endDate,
            Long departmentId,
            Long branchId,
            String status,
            Long employeeId,
            String search,
            String personnelType,
            String orderBy,
            Pageable pageable) {

        Specification<AttendanceRecord> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
            if (activeTenant != null && !activeTenant.isBlank() && !"all".equalsIgnoreCase(activeTenant)) {
                predicates.add(cb.equal(root.get("companyCode"), activeTenant.trim().toLowerCase()));
            }

            if (date != null) {
                predicates.add(cb.equal(root.get("attendanceDate"), date));
            } else if (startDate != null && endDate != null) {
                predicates.add(cb.between(root.get("attendanceDate"), startDate, endDate));
            }

            Join<AttendanceRecord, Employee> empJoin = root.join("employee", JoinType.LEFT);
            Join<AttendanceRecord, Student> stJoin = root.join("student", JoinType.LEFT);

            if (employeeId != null) {
                predicates.add(cb.equal(empJoin.get("id"), employeeId));
            }

            if (departmentId != null) {
                predicates.add(cb.equal(empJoin.get("department").get("id"), departmentId));
            }

            if (branchId != null) {
                predicates.add(cb.or(
                        cb.equal(empJoin.get("branch").get("id"), branchId),
                        cb.equal(stJoin.get("branch").get("id"), branchId)
                ));
            }

            if (status != null && !status.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("status"), status.trim().toUpperCase()));
            }

            // Personnel Type filter (STUDENT, TEACHER, EMPLOYEE)
            if (personnelType != null && !personnelType.trim().isEmpty() && !"ALL".equalsIgnoreCase(personnelType)) {
                String pType = personnelType.trim().toUpperCase();
                if ("STUDENT".equals(pType)) {
                    predicates.add(cb.isNotNull(root.get("student")));
                } else if ("TEACHER".equals(pType)) {
                    predicates.add(cb.isNotNull(root.get("employee")));
                    predicates.add(cb.or(
                            cb.isTrue(empJoin.get("isTeacher")),
                            cb.equal(cb.upper(empJoin.get("staffType")), "TEACHER"),
                            cb.equal(empJoin.get("department").get("id"), 4L),
                            cb.like(cb.lower(empJoin.get("department").get("name")), "%academic%"),
                            cb.like(cb.lower(empJoin.get("position").get("title")), "%teacher%"),
                            cb.like(cb.lower(empJoin.get("position").get("title")), "%lecturer%")
                    ));
                } else if ("EMPLOYEE".equals(pType) || "STAFF".equals(pType)) {
                    predicates.add(cb.isNotNull(root.get("employee")));
                    predicates.add(cb.and(
                            cb.or(cb.isNull(empJoin.get("isTeacher")), cb.isFalse(empJoin.get("isTeacher"))),
                            cb.or(cb.isNull(empJoin.get("staffType")), cb.notEqual(cb.upper(empJoin.get("staffType")), "TEACHER")),
                            cb.or(
                                    cb.isNull(empJoin.get("department")),
                                    cb.notEqual(empJoin.get("department").get("id"), 4L)
                            ),
                            cb.or(
                                    cb.isNull(empJoin.get("department")),
                                    cb.notLike(cb.lower(empJoin.get("department").get("name")), "%academic%")
                            )
                    ));
                }
            }

            // Comprehensive search across employees & students
            if (search != null && !search.trim().isEmpty()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate codeMatch = cb.like(cb.lower(empJoin.get("employeeCode")), pattern);
                Predicate engNameMatch = cb.like(cb.lower(empJoin.get("englishName")), pattern);
                Predicate khNameMatch = cb.like(cb.lower(empJoin.get("khmerName")), pattern);

                Predicate stCodeMatch = cb.like(cb.lower(stJoin.get("studentCode")), pattern);
                Predicate stEngMatch = cb.like(cb.lower(stJoin.get("englishName")), pattern);
                Predicate stKhMatch = cb.like(cb.lower(stJoin.get("khmerName")), pattern);
                Predicate stGradeMatch = cb.like(cb.lower(stJoin.get("grade")), pattern);
                Predicate stClassMatch = cb.like(cb.lower(stJoin.get("className")), pattern);

                predicates.add(cb.or(codeMatch, engNameMatch, khNameMatch, stCodeMatch, stEngMatch, stKhMatch, stGradeMatch, stClassMatch));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        // Custom order-by handling
        Pageable effectivePageable = pageable;
        if (pageable.getSort().isUnsorted()) {
            org.springframework.data.domain.Sort customSort;
            if ("TIME_DESC".equalsIgnoreCase(orderBy)) {
                customSort = org.springframework.data.domain.Sort.by(
                        org.springframework.data.domain.Sort.Order.desc("firstCheckIn"),
                        org.springframework.data.domain.Sort.Order.desc("id")
                );
            } else if ("TIME_ASC".equalsIgnoreCase(orderBy)) {
                customSort = org.springframework.data.domain.Sort.by(
                        org.springframework.data.domain.Sort.Order.asc("firstCheckIn"),
                        org.springframework.data.domain.Sort.Order.asc("id")
                );
            } else {
                // Default: punched/present records first, then ID desc
                customSort = org.springframework.data.domain.Sort.by(
                        org.springframework.data.domain.Sort.Order.desc("status"),
                        org.springframework.data.domain.Sort.Order.desc("id")
                );
            }
            effectivePageable = org.springframework.data.domain.PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), customSort);
        }

        Page<AttendanceRecord> page = recordRepository.findAll(spec, effectivePageable);
        List<AttendanceRecordDto> dtos = page.getContent().stream().map(this::toDto).collect(Collectors.toList());

        // In-memory stable sorting if role-based order was requested
        if (orderBy != null && !orderBy.trim().isEmpty()) {
            if ("ROLE_TEACHER_FIRST".equalsIgnoreCase(orderBy)) {
                dtos.sort(Comparator.comparingInt(d -> "TEACHER".equals(d.getPersonnelType()) ? 0 : "EMPLOYEE".equals(d.getPersonnelType()) ? 1 : 2));
            } else if ("ROLE_STUDENT_FIRST".equalsIgnoreCase(orderBy)) {
                dtos.sort(Comparator.comparingInt(d -> "STUDENT".equals(d.getPersonnelType()) ? 0 : "TEACHER".equals(d.getPersonnelType()) ? 1 : 2));
            } else if ("ROLE_EMPLOYEE_FIRST".equalsIgnoreCase(orderBy)) {
                dtos.sort(Comparator.comparingInt(d -> "EMPLOYEE".equals(d.getPersonnelType()) ? 0 : "TEACHER".equals(d.getPersonnelType()) ? 1 : 2));
            } else if ("NAME_ASC".equalsIgnoreCase(orderBy)) {
                dtos.sort(Comparator.comparing(d -> {
                    String name = d.getEmployeeName() != null ? d.getEmployeeName() : d.getStudentName();
                    return name != null ? name.toLowerCase() : "";
                }));
            }
        }

        return PageResponse.of(page, dtos);
    }

    @Transactional(readOnly = true)
    public List<LiveScanEventDto> getLiveScans(int limit) {
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        Pageable pageable = PageRequest.of(0, Math.min(Math.max(limit, 1), 100));
        Page<AttendanceRawLog> rawLogs;
        if (activeTenant == null || "all".equalsIgnoreCase(activeTenant)) {
            rawLogs = rawLogRepository.findAllByOrderByPunchTimeDesc(pageable);
        } else {
            rawLogs = rawLogRepository.findByCompanyCodeOrderByPunchTimeDesc(activeTenant, pageable);
        }

        return rawLogs.getContent().stream().map(this::toLiveScanEventDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PageResponse<LiveScanEventDto> getPunches(
            String search,
            String verifyType,
            String punchState,
            Long deviceId,
            LocalDate date,
            Pageable pageable) {

        Specification<AttendanceRawLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
            if (activeTenant != null && !activeTenant.isBlank() && !"all".equalsIgnoreCase(activeTenant)) {
                predicates.add(cb.equal(root.get("companyCode"), activeTenant.trim().toLowerCase()));
            }

            if (verifyType != null && !verifyType.isBlank() && !"ALL".equalsIgnoreCase(verifyType)) {
                predicates.add(cb.equal(cb.upper(root.get("verifyType")), verifyType.trim().toUpperCase()));
            }

            if (punchState != null && !punchState.isBlank() && !"ALL".equalsIgnoreCase(punchState)) {
                predicates.add(cb.equal(cb.upper(root.get("punchState")), punchState.trim().toUpperCase()));
            }

            if (deviceId != null) {
                predicates.add(cb.equal(root.get("device").get("id"), deviceId));
            }

            if (date != null) {
                Instant startOfDay = date.atStartOfDay(ZoneId.systemDefault()).toInstant();
                Instant endOfDay = date.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
                predicates.add(cb.between(root.get("punchTime"), startOfDay, endOfDay));
            }

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("devicePin")), pattern),
                        cb.like(cb.lower(root.get("deviceSn")), pattern)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<AttendanceRawLog> page = rawLogRepository.findAll(spec, pageable);
        List<LiveScanEventDto> dtos = page.getContent().stream().map(this::toLiveScanEventDto).collect(Collectors.toList());

        return PageResponse.of(page, dtos);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getPunchStats() {
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        LocalDate today = LocalDate.now();
        Instant startOfDay = today.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant endOfDay = today.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();

        long todayTotal;
        if (activeTenant == null || "all".equalsIgnoreCase(activeTenant)) {
            todayTotal = rawLogRepository.countByPunchTimeBetween(startOfDay, endOfDay);
        } else {
            todayTotal = rawLogRepository.countByCompanyCodeAndPunchTimeBetween(activeTenant, startOfDay, endOfDay);
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("todayTotal", todayTotal);
        return stats;
    }

    private LiveScanEventDto toLiveScanEventDto(AttendanceRawLog log) {
        String pin = log.getDevicePin();
        String logCompany = (log.getCompanyCode() != null && !log.getCompanyCode().isBlank()) 
                ? log.getCompanyCode().trim().toLowerCase() : "default";
        String cacheKey = logCompany + "_" + pin;

        // Ultra-fast in-memory cache lookup for personnel profile (0ms response)
        LiveScanEventDto cached = (pin != null) ? personnelCache.get(cacheKey) : null;
        if (cached != null) {
            return LiveScanEventDto.builder()
                    .logId(log.getId())
                    .deviceId(log.getDevice() != null ? log.getDevice().getId() : null)
                    .deviceName(log.getDevice() != null ? log.getDevice().getName() : "Terminal (SN: " + log.getDeviceSn() + ")")
                    .deviceSn(log.getDeviceSn())
                    .devicePin(pin)
                    .personnelName(cached.getPersonnelName())
                    .personnelKhmerName(cached.getPersonnelKhmerName())
                    .personnelCode(cached.getPersonnelCode())
                    .personnelType(cached.getPersonnelType())
                    .departmentOrClass(cached.getDepartmentOrClass())
                    .positionOrGrade(cached.getPositionOrGrade())
                    .branchOrYear(cached.getBranchOrYear())
                    .gender(cached.getGender())
                    .contactInfo(cached.getContactInfo())
                    .cardNumber(cached.getCardNumber())
                    .profileImageUrl(cached.getProfileImageUrl())
                    .punchTime(log.getPunchTime())
                    .verifyType(log.getVerifyType() != null ? log.getVerifyType() : "OTHER")
                    .punchState(log.getPunchState() != null ? log.getPunchState() : "CHECK_IN")
                    .statusMessage("VERIFIED_SUCCESS")
                    .companyCode(cached.getCompanyCode() != null ? cached.getCompanyCode() : log.getCompanyCode())
                    .build();
        }

        String name = "Card / User (" + pin + ")";
        String khmerName = null;
        String code = pin;
        String type = "EMPLOYEE";
        String deptOrClass = "General Campus";
        String positionOrGrade = null;
        String branchOrYear = null;
        String gender = null;
        String contactInfo = null;
        String card = null;
        String photo = null;

        // 1. Check Device User mapping first
        Optional<AttendanceDeviceUser> devUserOpt = Optional.empty();
        if (log.getDeviceSn() != null && pin != null) {
            devUserOpt = deviceUserRepository.findByDeviceSerialNumberAndDevicePin(log.getDeviceSn(), pin);
        }
        if (devUserOpt.isEmpty() && log.getDevice() != null && pin != null) {
            devUserOpt = deviceUserRepository.findByDeviceIdAndDevicePin(log.getDevice().getId(), pin);
        }

        if (devUserOpt.isPresent()) {
            AttendanceDeviceUser du = devUserOpt.get();
            if (du.getCardNumber() != null) card = du.getCardNumber();
            if (du.getNameOnDevice() != null && !du.getNameOnDevice().isBlank()) {
                name = du.getNameOnDevice();
            }

            if (du.getStudent() != null) {
                Student st = du.getStudent();
                name = st.getEnglishName();
                khmerName = st.getKhmerName();
                code = st.getStudentCode();
                photo = st.getProfileImageUrl();
                type = "STUDENT";
                deptOrClass = (st.getClassName() != null ? st.getClassName() : "") +
                              (st.getGrade() != null ? " (" + st.getGrade() + ")" : "");
                positionOrGrade = st.getGrade() != null ? st.getGrade() : "Student";
                branchOrYear = st.getAcademicYear() != null ? st.getAcademicYear() : null;
                gender = st.getGender();
                contactInfo = st.getParentContact();
            } else if (du.getEmployee() != null) {
                Employee emp = du.getEmployee();
                name = emp.getEnglishName();
                khmerName = emp.getKhmerName();
                code = emp.getEmployeeCode();
                photo = emp.getProfileImageUrl();
                boolean isTeacher = (emp.getDepartment() != null && emp.getDepartment().getName().toLowerCase().contains("teach")) ||
                                    (emp.getPosition() != null && emp.getPosition().getTitle().toLowerCase().contains("teach"));
                type = isTeacher ? "TEACHER" : "EMPLOYEE";
                deptOrClass = emp.getDepartment() != null ? emp.getDepartment().getName() : "Office Staff";
                positionOrGrade = emp.getPosition() != null ? emp.getPosition().getTitle() : "Staff";
                branchOrYear = emp.getBranch() != null ? emp.getBranch().getName() : null;
                gender = emp.getGender();
                contactInfo = emp.getPhoneNumber();
            }
        }

        // 2. Direct student lookup if still unresolved (company-scoped first)
        if (("Card / User (" + pin + ")").equals(name) && pin != null) {
            Optional<Student> stOpt = (logCompany != null && !logCompany.isBlank() && !"default".equalsIgnoreCase(logCompany))
                    ? studentRepository.findByCompanyCodeAndStudentCodeAndDeletedAtIsNull(logCompany, pin)
                    : studentRepository.findByStudentCodeAndDeletedAtIsNull(pin);
            if (stOpt.isEmpty()) {
                stOpt = studentRepository.findByStudentCodeAndDeletedAtIsNull(pin);
            }
            if (stOpt.isEmpty()) {
                stOpt = studentRepository.findFirstByStudentCodeOrderByIdDesc(pin);
            }
            if (stOpt.isPresent()) {
                Student st = stOpt.get();
                name = st.getEnglishName();
                khmerName = st.getKhmerName();
                code = st.getStudentCode();
                photo = st.getProfileImageUrl();
                type = "STUDENT";
                deptOrClass = (st.getClassName() != null ? st.getClassName() : "") +
                              (st.getGrade() != null ? " (" + st.getGrade() + ")" : "");
                positionOrGrade = st.getGrade() != null ? st.getGrade() : "Student";
                branchOrYear = st.getAcademicYear() != null ? st.getAcademicYear() : null;
                gender = st.getGender();
                contactInfo = st.getParentContact();
            }
        }

        // 3. Direct employee lookup if still unresolved (company-scoped first)
        if (("Card / User (" + pin + ")").equals(name) && pin != null) {
            Optional<Employee> empOpt = (logCompany != null && !logCompany.isBlank() && !"default".equalsIgnoreCase(logCompany))
                    ? employeeRepository.findByCompanyCodeAndEmployeeCodeAndDeletedAtIsNull(logCompany, pin)
                    : employeeRepository.findByEmployeeCodeAndDeletedAtIsNull(pin);
            if (empOpt.isEmpty()) {
                empOpt = employeeRepository.findByEmployeeCodeAndDeletedAtIsNull(pin);
            }
            if (empOpt.isEmpty()) {
                empOpt = employeeRepository.findFirstByEmployeeCodeOrderByIdDesc(pin);
            }
            if (empOpt.isPresent()) {
                Employee emp = empOpt.get();
                name = emp.getEnglishName();
                khmerName = emp.getKhmerName();
                code = emp.getEmployeeCode();
                photo = emp.getProfileImageUrl();
                boolean isTeacher = (emp.getDepartment() != null && emp.getDepartment().getName().toLowerCase().contains("teach")) ||
                                    (emp.getPosition() != null && emp.getPosition().getTitle().toLowerCase().contains("teach"));
                type = isTeacher ? "TEACHER" : "EMPLOYEE";
                deptOrClass = emp.getDepartment() != null ? emp.getDepartment().getName() : "Office Staff";
                positionOrGrade = emp.getPosition() != null ? emp.getPosition().getTitle() : "Staff";
                branchOrYear = emp.getBranch() != null ? emp.getBranch().getName() : null;
                gender = emp.getGender();
                contactInfo = emp.getPhoneNumber();
            }
        }

        // 4. Face Biometric lookup for photo & name if still unresolved or missing photo
        if (pin != null) {
            Optional<FaceBiometric> faceOpt = faceBiometricRepository.findByDevicePin(pin);
            if (faceOpt.isPresent()) {
                FaceBiometric fb = faceOpt.get();
                if (photo == null || photo.isBlank()) {
                    if (fb.getEmployee() != null && fb.getEmployee().getProfileImageUrl() != null && !fb.getEmployee().getProfileImageUrl().isBlank()) {
                        photo = fb.getEmployee().getProfileImageUrl();
                    } else if (fb.getStudent() != null && fb.getStudent().getProfileImageUrl() != null && !fb.getStudent().getProfileImageUrl().isBlank()) {
                        photo = fb.getStudent().getProfileImageUrl();
                    } else {
                        photo = fb.getPhotoPath();
                    }
                }
                if (fb.getEmployee() != null) {
                    if (positionOrGrade == null) positionOrGrade = fb.getEmployee().getPosition() != null ? fb.getEmployee().getPosition().getTitle() : null;
                    if (branchOrYear == null) branchOrYear = fb.getEmployee().getBranch() != null ? fb.getEmployee().getBranch().getName() : null;
                    if (gender == null) gender = fb.getEmployee().getGender();
                    if (contactInfo == null) contactInfo = fb.getEmployee().getPhoneNumber();
                } else if (fb.getStudent() != null) {
                    if (positionOrGrade == null) positionOrGrade = fb.getStudent().getGrade();
                    if (branchOrYear == null) branchOrYear = fb.getStudent().getAcademicYear();
                    if (gender == null) gender = fb.getStudent().getGender();
                    if (contactInfo == null) contactInfo = fb.getStudent().getParentContact();
                }
                if (("Card / User (" + pin + ")").equals(name) && fb.getPersonName() != null) {
                    name = fb.getPersonName();
                    type = fb.getPersonnelType() != null ? fb.getPersonnelType() : type;
                }
            }
        }

        String resolvedCompanyCode = log.getCompanyCode();
        if (devUserOpt.isPresent() && devUserOpt.get().getCompanyCode() != null) {
            resolvedCompanyCode = devUserOpt.get().getCompanyCode();
        }
        if (resolvedCompanyCode == null) {
            resolvedCompanyCode = "default";
        }

        LiveScanEventDto dto = LiveScanEventDto.builder()
                .logId(log.getId())
                .deviceId(log.getDevice() != null ? log.getDevice().getId() : null)
                .deviceName(log.getDevice() != null ? log.getDevice().getName() : "Terminal (SN: " + log.getDeviceSn() + ")")
                .deviceSn(log.getDeviceSn())
                .devicePin(pin)
                .personnelName(name)
                .personnelKhmerName(khmerName)
                .personnelCode(code)
                .personnelType(type)
                .departmentOrClass(deptOrClass)
                .positionOrGrade(positionOrGrade)
                .branchOrYear(branchOrYear)
                .gender(gender)
                .contactInfo(contactInfo)
                .cardNumber(card)
                .profileImageUrl(photo)
                .punchTime(log.getPunchTime())
                .verifyType(log.getVerifyType() != null ? log.getVerifyType() : "OTHER")
                .punchState(log.getPunchState() != null ? log.getPunchState() : "CHECK_IN")
                .statusMessage("VERIFIED_SUCCESS")
                .companyCode(resolvedCompanyCode)
                .build();

        if (pin != null && !("Card / User (" + pin + ")").equals(name)) {
            personnelCache.put(cacheKey, dto);
        }

        return dto;
    }

    @Transactional(readOnly = true)
    public PageResponse<com.zkteco.attendance.modules.attendance.dto.AttendanceRawLogDto> getRawLogs(Pageable pageable) {
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        Page<AttendanceRawLog> page;
        if (activeTenant == null || "all".equalsIgnoreCase(activeTenant)) {
            page = rawLogRepository.findAllByOrderByPunchTimeDesc(pageable);
        } else {
            page = rawLogRepository.findByCompanyCodeOrderByPunchTimeDesc(activeTenant, pageable);
        }
        List<com.zkteco.attendance.modules.attendance.dto.AttendanceRawLogDto> dtos = page.getContent().stream().map(log -> {
            LiveScanEventDto resolved = toLiveScanEventDto(log);

            return com.zkteco.attendance.modules.attendance.dto.AttendanceRawLogDto.builder()
                    .id(log.getId())
                    .deviceId(log.getDevice() != null ? log.getDevice().getId() : null)
                    .deviceName(log.getDevice() != null ? log.getDevice().getName() : null)
                    .deviceSn(log.getDeviceSn())
                    .devicePin(log.getDevicePin())
                    .employeeName(resolved.getPersonnelName())
                    .employeeCode(resolved.getPersonnelCode())
                    .punchTime(log.getPunchTime())
                    .verifyType(log.getVerifyType())
                    .punchState(log.getPunchState())
                    .workCode(log.getWorkCode())
                    .processed(log.isProcessed())
                    .processedAt(log.getProcessedAt())
                    .createdAt(log.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
        return PageResponse.of(page, dtos);
    }

    @Transactional
    public AttendanceRecordDto createManualAttendance(ManualAttendanceRequest request) {
        Employee employee = null;
        if (request.getEmployeeId() != null) {
            employee = employeeRepository.findById(request.getEmployeeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", request.getEmployeeId()));
        }

        Shift shift = null;
        if (request.getShiftId() != null) {
            shift = shiftRepository.findById(request.getShiftId()).orElse(null);
        }

        AttendanceRecord record = recordRepository.findByEmployeeIdAndAttendanceDate(request.getEmployeeId(), request.getAttendanceDate())
                .orElseGet(() -> AttendanceRecord.builder()
                        .attendanceDate(request.getAttendanceDate())
                        .build());

        record.setEmployee(employee);
        record.setShift(shift);
        record.setFirstCheckIn(request.getFirstCheckIn());
        record.setLastCheckOut(request.getLastCheckOut());
        record.setStatus(request.getStatus() != null ? request.getStatus().toUpperCase() : "PRESENT");
        record.setManualAdjusted(true);
        record.setRemarks(request.getRemarks() != null ? request.getRemarks() : "Manually entered/adjusted");

        return toDto(recordRepository.save(record));
    }

    @Transactional
    public AttendanceProcessingLog triggerProcessing(LocalDate date) {
        LocalDate targetDate = (date != null) ? date : LocalDate.now();
        return calculationEngine.processAttendanceForDate(targetDate);
    }

    public AttendanceRecordDto toDto(AttendanceRecord r) {
        String pType = "EMPLOYEE";
        if (r.getStudent() != null) {
            pType = "STUDENT";
        } else if (r.getEmployee() != null) {
            if (r.getEmployee().isTeacherPerson()) {
                pType = "TEACHER";
            } else if (r.getEmployee().getDepartment() != null &&
                    (Long.valueOf(4L).equals(r.getEmployee().getDepartment().getId()) ||
                            (r.getEmployee().getDepartment().getName() != null && r.getEmployee().getDepartment().getName().toLowerCase().contains("academic")))) {
                pType = "TEACHER";
            } else if (r.getEmployee().getPosition() != null &&
                    (r.getEmployee().getPosition().getTitle() != null &&
                            (r.getEmployee().getPosition().getTitle().toLowerCase().contains("teacher") || r.getEmployee().getPosition().getTitle().toLowerCase().contains("lecturer")))) {
                pType = "TEACHER";
            } else {
                pType = "EMPLOYEE";
            }
        }

        String displayName = null;
        String displayCode = null;
        if (r.getEmployee() != null) {
            displayName = r.getEmployee().getEnglishName();
            displayCode = r.getEmployee().getEmployeeCode();
        } else if (r.getStudent() != null) {
            displayName = r.getStudent().getEnglishName();
            displayCode = r.getStudent().getStudentCode();
        }

        // Shift 2 check-out should strictly only reflect actual afternoon checkouts
        Instant shift2Out = r.getShift2CheckOut();
        if (shift2Out == null && r.getLastCheckOut() != null && !r.getLastCheckOut().equals(r.getShift1CheckOut())) {
            shift2Out = r.getLastCheckOut();
        }

        Long branchId = null;
        String branchName = null;
        String branchCode = null;
        if (r.getEmployee() != null && r.getEmployee().getBranch() != null) {
            branchId = r.getEmployee().getBranch().getId();
            branchName = r.getEmployee().getBranch().getName();
            branchCode = r.getEmployee().getBranch().getCode();
        } else if (r.getStudent() != null && r.getStudent().getBranch() != null) {
            branchId = r.getStudent().getBranch().getId();
            branchName = r.getStudent().getBranch().getName();
            branchCode = r.getStudent().getBranch().getCode();
        }

        int s1Late = 0;
        int s1Early = 0;
        int s2Late = 0;
        int s2Early = 0;
        if (r.getShift() != null) {
            Shift shift = r.getShift();
            int graceLate = shift.getGraceLateMinutes();
            int graceEarly = shift.getGraceEarlyLeaveMinutes();

            // Shift 1 Late
            if (r.getFirstCheckIn() != null && shift.getStartTime() != null) {
                LocalTime s1InLt = TimeUtils.toPhnomPenhLocalTime(r.getFirstCheckIn());
                if (s1InLt.isAfter(shift.getStartTime().plusMinutes(graceLate))) {
                    s1Late = (int) Duration.between(shift.getStartTime(), s1InLt).toMinutes();
                }
            }

            // Shift 1 Early Leave (before lunch break)
            if (r.getShift1CheckOut() != null && shift.getBreakStart() != null) {
                LocalTime s1OutLt = TimeUtils.toPhnomPenhLocalTime(r.getShift1CheckOut());
                if (s1OutLt.isBefore(shift.getBreakStart().minusMinutes(graceEarly))) {
                    s1Early = (int) Duration.between(s1OutLt, shift.getBreakStart()).toMinutes();
                }
            }

            // Shift 2 Late (after lunch break)
            if (r.getShift2CheckIn() != null && shift.getBreakEnd() != null) {
                LocalTime s2InLt = TimeUtils.toPhnomPenhLocalTime(r.getShift2CheckIn());
                if (s2InLt.isAfter(shift.getBreakEnd().plusMinutes(graceLate))) {
                    s2Late = (int) Duration.between(shift.getBreakEnd(), s2InLt).toMinutes();
                }
            }

            // Shift 2 Early Leave (before shift end)
            Instant s2OutEff = shift2Out != null ? shift2Out : r.getShift2CheckOut();
            if (s2OutEff != null && shift.getEndTime() != null) {
                LocalTime s2OutLt = TimeUtils.toPhnomPenhLocalTime(s2OutEff);
                if (s2OutLt.isBefore(shift.getEndTime().minusMinutes(graceEarly))) {
                    s2Early = (int) Duration.between(s2OutLt, shift.getEndTime()).toMinutes();
                }
            }
        }

        return AttendanceRecordDto.builder()
                .id(r.getId())
                .attendanceDate(r.getAttendanceDate())
                .employeeId(r.getEmployee() != null ? r.getEmployee().getId() : null)
                .employeeCode(displayCode)
                .employeeName(displayName)
                .departmentId(r.getEmployee() != null && r.getEmployee().getDepartment() != null ? r.getEmployee().getDepartment().getId() : null)
                .departmentName(r.getEmployee() != null && r.getEmployee().getDepartment() != null ? r.getEmployee().getDepartment().getName() : (r.getStudent() != null ? r.getStudent().getClassName() : null))
                .branchId(branchId)
                .branchName(branchName)
                .branchCode(branchCode)
                .studentId(r.getStudent() != null ? r.getStudent().getId() : null)
                .studentCode(r.getStudent() != null ? r.getStudent().getStudentCode() : null)
                .studentName(r.getStudent() != null ? r.getStudent().getEnglishName() : null)
                .studentGrade(r.getStudent() != null ? r.getStudent().getGrade() : null)
                .studentClassName(r.getStudent() != null ? r.getStudent().getClassName() : null)
                .personnelType(pType)
                .shiftId(r.getShift() != null ? r.getShift().getId() : null)
                .shiftName(r.getShift() != null ? r.getShift().getName() : null)
                .firstCheckIn(r.getFirstCheckIn())
                .shift1CheckIn(r.getFirstCheckIn())
                .shift1CheckOut(r.getShift1CheckOut())
                .shift2CheckIn(r.getShift2CheckIn())
                .lastCheckOut(r.getLastCheckOut())
                .shift2CheckOut(shift2Out)
                .inDeviceName(r.getInDevice() != null ? r.getInDevice().getName() : null)
                .outDeviceName(r.getOutDevice() != null ? r.getOutDevice().getName() : null)
                .totalWorkMinutes(r.getTotalWorkMinutes())
                .lateMinutes(r.getLateMinutes())
                .earlyLeaveMinutes(r.getEarlyLeaveMinutes())
                .shift1LateMinutes(s1Late)
                .shift1EarlyMinutes(s1Early)
                .shift2LateMinutes(s2Late)
                .shift2EarlyMinutes(s2Early)
                .overtimeMinutes(r.getOvertimeMinutes())
                .breakMinutes(r.getBreakMinutes())
                .status(r.getStatus())
                .manualAdjusted(r.isManualAdjusted())
                .remarks(r.getRemarks())
                .build();
    }
}

