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
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final AttendanceRecordRepository recordRepository;
    private final AttendanceService attendanceService;

    @Transactional(readOnly = true)
    public List<AttendanceRecordDto> getReportRecords(LocalDate startDate, LocalDate endDate, Long departmentId, Long employeeId, String status) {
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

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return recordRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "attendanceDate", "id"))
                .stream()
                .map(attendanceService::toDto)
                .collect(Collectors.toList());
    }
}

