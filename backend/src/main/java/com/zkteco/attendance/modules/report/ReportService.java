package com.zkteco.attendance.modules.report;

import com.zkteco.attendance.modules.attendance.AttendanceRecord;
import com.zkteco.attendance.modules.attendance.AttendanceRecordRepository;
import com.zkteco.attendance.modules.attendance.AttendanceService;
import com.zkteco.attendance.modules.attendance.dto.AttendanceRecordDto;
import com.zkteco.attendance.modules.report.dto.UserSummaryDto;
import com.zkteco.attendance.modules.personnel.Employee;
import com.zkteco.attendance.modules.personnel.Student;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final AttendanceRecordRepository recordRepository;
    private final AttendanceService attendanceService;

    @Transactional(readOnly = true)
    public List<AttendanceRecordDto> getReportRecords(LocalDate startDate, LocalDate endDate, Long departmentId, Long employeeId, String status) {
        return getReportRecords(startDate, endDate, departmentId, null, employeeId, null, null, status, null, null);
    }

    @Transactional(readOnly = true)
    public List<AttendanceRecordDto> getReportRecords(LocalDate startDate, LocalDate endDate, Long departmentId, Long employeeId, String status, String personnelType, String orderBy) {
        return getReportRecords(startDate, endDate, departmentId, null, employeeId, null, null, status, personnelType, orderBy);
    }

    @Transactional(readOnly = true)
    public List<AttendanceRecordDto> getReportRecords(LocalDate startDate, LocalDate endDate, Long departmentId, Long employeeId, Long studentId, String userCode, String status, String personnelType, String orderBy) {
        return getReportRecords(startDate, endDate, departmentId, null, employeeId, studentId, userCode, status, personnelType, orderBy);
    }

    @Transactional(readOnly = true)
    public List<AttendanceRecordDto> getReportRecords(LocalDate startDate, LocalDate endDate, Long departmentId, Long branchId, Long employeeId, Long studentId, String userCode, String status, String personnelType, String orderBy) {
        Specification<AttendanceRecord> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Multi-tenant organizational scoping
            String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
            if (activeTenant != null && !activeTenant.isBlank() && !"all".equalsIgnoreCase(activeTenant)) {
                predicates.add(cb.equal(root.get("companyCode"), activeTenant.trim().toLowerCase()));
            }

            // Left joins to ensure records with null employee or null student are never filtered out
            Join<AttendanceRecord, Employee> empJoin = root.join("employee", JoinType.LEFT);
            Join<AttendanceRecord, Student> stuJoin = root.join("student", JoinType.LEFT);

            if (startDate != null && endDate != null) {
                predicates.add(cb.between(root.get("attendanceDate"), startDate, endDate));
            } else if (startDate != null) {
                predicates.add(cb.equal(root.get("attendanceDate"), startDate));
            }

            if (employeeId != null) {
                predicates.add(cb.equal(empJoin.get("id"), employeeId));
            }

            if (studentId != null) {
                predicates.add(cb.equal(stuJoin.get("id"), studentId));
            }

            if (userCode != null && !userCode.trim().isEmpty()) {
                String clean = userCode.trim();
                predicates.add(cb.or(
                        cb.equal(empJoin.get("employeeCode"), clean),
                        cb.equal(stuJoin.get("studentCode"), clean)
                ));
            }

            if (departmentId != null) {
                predicates.add(cb.equal(empJoin.get("department").get("id"), departmentId));
            }

            if (branchId != null) {
                predicates.add(cb.or(
                        cb.equal(empJoin.get("branch").get("id"), branchId),
                        cb.equal(stuJoin.get("branch").get("id"), branchId)
                ));
            }

            if (status != null && !status.trim().isEmpty() && !"ALL".equalsIgnoreCase(status)) {
                predicates.add(cb.equal(root.get("status"), status.trim().toUpperCase()));
            } else {
                // Scheduled rest days are excluded from attendance reports by default
                predicates.add(cb.notEqual(root.get("status"), "REST_DAY"));
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

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        List<AttendanceRecordDto> dtos = recordRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "attendanceDate", "id"))
                .stream()
                .map(attendanceService::toDto)
                .collect(Collectors.toList());

        // Role-based sorting
        if (orderBy != null && !orderBy.trim().isEmpty()) {
            if ("ROLE_TEACHER_FIRST".equalsIgnoreCase(orderBy)) {
                dtos.sort(Comparator.comparingInt(d -> "TEACHER".equals(d.getPersonnelType()) ? 0 : "EMPLOYEE".equals(d.getPersonnelType()) ? 1 : 2));
            } else if ("ROLE_STUDENT_FIRST".equalsIgnoreCase(orderBy)) {
                dtos.sort(Comparator.comparingInt(d -> "STUDENT".equals(d.getPersonnelType()) ? 0 : "TEACHER".equals(d.getPersonnelType()) ? 1 : 2));
            } else if ("ROLE_EMPLOYEE_FIRST".equalsIgnoreCase(orderBy)) {
                dtos.sort(Comparator.comparingInt(d -> "EMPLOYEE".equals(d.getPersonnelType()) ? 0 : "TEACHER".equals(d.getPersonnelType()) ? 1 : 2));
            } else if ("NAME_ASC".equalsIgnoreCase(orderBy)) {
                dtos.sort(Comparator.comparing(d -> d.getEmployeeName() != null ? d.getEmployeeName().toLowerCase() : ""));
            } else if ("DATE_ASC".equalsIgnoreCase(orderBy)) {
                dtos.sort(Comparator.comparing(AttendanceRecordDto::getAttendanceDate));
            }
        }

        return dtos;
    }

    /**
     * Compute aggregated attendance statistics per user (matching "Each User Summary" view)
     */
    @Transactional(readOnly = true)
    public List<UserSummaryDto> getUserSummaries(LocalDate startDate, LocalDate endDate,
                                                 Long departmentId, Long employeeId, Long studentId,
                                                 String userCode, String status, String personnelType,
                                                 String orderBy) {
        return getUserSummaries(startDate, endDate, departmentId, null, employeeId, studentId, userCode, status, personnelType, orderBy);
    }

    @Transactional(readOnly = true)
    public List<UserSummaryDto> getUserSummaries(LocalDate startDate, LocalDate endDate,
                                                 Long departmentId, Long branchId, Long employeeId, Long studentId,
                                                 String userCode, String status, String personnelType,
                                                 String orderBy) {
        List<AttendanceRecordDto> records = getReportRecords(startDate, endDate, departmentId, branchId,
                employeeId, studentId, userCode, status, personnelType, orderBy);

        Map<String, UserSummaryDto> summaryMap = new LinkedHashMap<>();

        for (AttendanceRecordDto r : records) {
            String code = r.getStudentCode() != null && !r.getStudentCode().trim().isEmpty() ? r.getStudentCode().trim()
                    : r.getEmployeeCode() != null && !r.getEmployeeCode().trim().isEmpty() ? r.getEmployeeCode().trim()
                    : String.valueOf(r.getEmployeeId() != null ? r.getEmployeeId() : r.getStudentId());

            if (code == null || code.isEmpty() || "null".equals(code)) continue;

            String name = r.getStudentName() != null && !r.getStudentName().trim().isEmpty() ? r.getStudentName()
                    : r.getEmployeeName() != null && !r.getEmployeeName().trim().isEmpty() ? r.getEmployeeName()
                    : "Unknown User";

            String khmerName = "";
            String role = r.getPersonnelType() != null ? r.getPersonnelType() : "EMPLOYEE";
            String deptOrClass = r.getDepartmentName() != null && !r.getDepartmentName().trim().isEmpty() ? r.getDepartmentName()
                    : r.getStudentGrade() != null ? (r.getStudentGrade() + " " + (r.getStudentClassName() != null ? r.getStudentClassName() : "")).trim()
                    : "Staff";

            UserSummaryDto summary = summaryMap.computeIfAbsent(code, k -> UserSummaryDto.builder()
                    .code(code)
                    .name(name)
                    .khmerName(khmerName)
                    .branchName(r.getBranchName())
                    .personnelType(role)
                    .departmentOrClass(deptOrClass)
                    .employeeId(r.getEmployeeId())
                    .studentId(r.getStudentId())
                    .daysActive(0)
                    .present(0)
                    .late(0)
                    .absent(0)
                    .onLeave(0)
                    .holiday(0)
                    .totalWorkMinutes(0)
                    .totalLateMinutes(0)
                    .totalHours(0.0)
                    .punctualityRate(0)
                    .build());

            summary.setDaysActive(summary.getDaysActive() + 1);
            String st = r.getStatus() != null ? r.getStatus().toUpperCase() : "";
            if ("PRESENT".equals(st)) {
                summary.setPresent(summary.getPresent() + 1);
            } else if ("LATE".equals(st)) {
                summary.setLate(summary.getLate() + 1);
            } else if ("ABSENT".equals(st)) {
                summary.setAbsent(summary.getAbsent() + 1);
            } else if ("ON_LEAVE".equals(st)) {
                summary.setOnLeave(summary.getOnLeave() + 1);
            } else if ("HOLIDAY".equals(st)) {
                summary.setHoliday(summary.getHoliday() + 1);
            }

            summary.setTotalWorkMinutes(summary.getTotalWorkMinutes() + r.getTotalWorkMinutes());
            summary.setTotalLateMinutes(summary.getTotalLateMinutes() + r.getLateMinutes());
        }

        List<UserSummaryDto> list = new ArrayList<>(summaryMap.values());
        for (UserSummaryDto u : list) {
            double hrs = Math.round((u.getTotalWorkMinutes() / 60.0) * 10.0) / 10.0;
            u.setTotalHours(hrs);
            int rate = u.getDaysActive() > 0 ? (int) Math.round(((u.getPresent() + u.getLate()) * 100.0) / u.getDaysActive()) : 0;
            u.setPunctualityRate(rate);
        }

        // Sorting
        if (orderBy != null && !orderBy.trim().isEmpty()) {
            if ("ROLE_TEACHER_FIRST".equalsIgnoreCase(orderBy)) {
                list.sort(Comparator.comparingInt(u -> "TEACHER".equals(u.getPersonnelType()) ? 0 : "EMPLOYEE".equals(u.getPersonnelType()) ? 1 : 2));
            } else if ("ROLE_STUDENT_FIRST".equalsIgnoreCase(orderBy)) {
                list.sort(Comparator.comparingInt(u -> "STUDENT".equals(u.getPersonnelType()) ? 0 : "TEACHER".equals(u.getPersonnelType()) ? 1 : 2));
            } else if ("ROLE_EMPLOYEE_FIRST".equalsIgnoreCase(orderBy)) {
                list.sort(Comparator.comparingInt(u -> "EMPLOYEE".equals(u.getPersonnelType()) ? 0 : "TEACHER".equals(u.getPersonnelType()) ? 1 : 2));
            } else if ("NAME_ASC".equalsIgnoreCase(orderBy)) {
                list.sort(Comparator.comparing(u -> u.getName() != null ? u.getName().toLowerCase() : ""));
            }
        }

        return list;
    }
}

