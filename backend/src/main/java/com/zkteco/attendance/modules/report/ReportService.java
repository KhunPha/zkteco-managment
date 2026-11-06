package com.zkteco.attendance.modules.report;

import com.zkteco.attendance.modules.attendance.AttendanceRecord;
import com.zkteco.attendance.modules.attendance.AttendanceRecordRepository;
import com.zkteco.attendance.modules.attendance.AttendanceService;
import com.zkteco.attendance.modules.attendance.dto.AttendanceRecordDto;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final AttendanceRecordRepository recordRepository;
    private final AttendanceService attendanceService;

    @Transactional(readOnly = true)
    public List<AttendanceRecordDto> getReportRecords(LocalDate startDate, LocalDate endDate, Long departmentId, Long employeeId, String status) {
        return getReportRecords(startDate, endDate, departmentId, employeeId, status, null, null);
    }

    @Transactional(readOnly = true)
    public List<AttendanceRecordDto> getReportRecords(LocalDate startDate, LocalDate endDate, Long departmentId, Long employeeId, String status, String personnelType, String orderBy) {
        Specification<AttendanceRecord> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (startDate != null && endDate != null) {
                predicates.add(cb.between(root.get("attendanceDate"), startDate, endDate));
            } else if (startDate != null) {
                predicates.add(cb.equal(root.get("attendanceDate"), startDate));
            }

            if (employeeId != null) {
                predicates.add(cb.equal(root.get("employee").get("id"), employeeId));
            }

            if (departmentId != null) {
                predicates.add(cb.equal(root.get("employee").get("department").get("id"), departmentId));
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
                            cb.equal(root.get("employee").get("department").get("id"), 4L),
                            cb.like(cb.lower(root.get("employee").get("department").get("name")), "%academic%"),
                            cb.like(cb.lower(root.get("employee").get("position").get("title")), "%teacher%"),
                            cb.like(cb.lower(root.get("employee").get("position").get("title")), "%lecturer%")
                    ));
                } else if ("EMPLOYEE".equals(pType) || "STAFF".equals(pType)) {
                    predicates.add(cb.isNotNull(root.get("employee")));
                    predicates.add(cb.and(
                            cb.or(
                                    cb.isNull(root.get("employee").get("department")),
                                    cb.notEqual(root.get("employee").get("department").get("id"), 4L)
                            ),
                            cb.or(
                                    cb.isNull(root.get("employee").get("department")),
                                    cb.notLike(cb.lower(root.get("employee").get("department").get("name")), "%academic%")
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
}

