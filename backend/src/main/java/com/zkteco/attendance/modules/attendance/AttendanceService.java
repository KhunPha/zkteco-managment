package com.zkteco.attendance.modules.attendance;

import com.zkteco.attendance.common.AppException;
import com.zkteco.attendance.common.ErrorCode;
import com.zkteco.attendance.common.PageResponse;
import com.zkteco.attendance.common.ResourceNotFoundException;
import com.zkteco.attendance.modules.attendance.dto.AttendanceRecordDto;
import com.zkteco.attendance.modules.attendance.dto.ManualAttendanceRequest;
import com.zkteco.attendance.modules.personnel.Employee;
import com.zkteco.attendance.modules.personnel.EmployeeRepository;
import com.zkteco.attendance.modules.shift.Shift;
import com.zkteco.attendance.modules.shift.ShiftRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
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

    @Transactional(readOnly = true)
    public PageResponse<AttendanceRecordDto> getAttendanceRecords(
            LocalDate date,
            LocalDate startDate,
            LocalDate endDate,
            Long departmentId,
            Long branchId,
            String status,
            Long employeeId,
            Pageable pageable) {

        Specification<AttendanceRecord> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (date != null) {
                predicates.add(cb.equal(root.get("attendanceDate"), date));
            } else if (startDate != null && endDate != null) {
                predicates.add(cb.between(root.get("attendanceDate"), startDate, endDate));
            }

            if (employeeId != null) {
                predicates.add(cb.equal(root.get("employee").get("id"), employeeId));
            }

            if (departmentId != null) {
                predicates.add(cb.equal(root.get("employee").get("department").get("id"), departmentId));
            }

            if (branchId != null) {
                predicates.add(cb.equal(root.get("employee").get("branch").get("id"), branchId));
            }

            if (status != null && !status.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("status"), status.trim().toUpperCase()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<AttendanceRecord> page = recordRepository.findAll(spec, pageable);
        List<AttendanceRecordDto> dtos = page.getContent().stream().map(this::toDto).collect(Collectors.toList());
        return PageResponse.of(page, dtos);
    }

    @Transactional(readOnly = true)
    public PageResponse<AttendanceRawLog> getRawLogs(Pageable pageable) {
        Page<AttendanceRawLog> page = rawLogRepository.findAllByOrderByPunchTimeDesc(pageable);
        return PageResponse.of(page);
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
        return AttendanceRecordDto.builder()
                .id(r.getId())
                .attendanceDate(r.getAttendanceDate())
                .employeeId(r.getEmployee() != null ? r.getEmployee().getId() : null)
                .employeeCode(r.getEmployee() != null ? r.getEmployee().getEmployeeCode() : null)
                .employeeName(r.getEmployee() != null ? r.getEmployee().getEnglishName() : null)
                .departmentId(r.getEmployee() != null && r.getEmployee().getDepartment() != null ? r.getEmployee().getDepartment().getId() : null)
                .departmentName(r.getEmployee() != null && r.getEmployee().getDepartment() != null ? r.getEmployee().getDepartment().getName() : null)
                .studentId(r.getStudent() != null ? r.getStudent().getId() : null)
                .studentCode(r.getStudent() != null ? r.getStudent().getStudentCode() : null)
                .studentName(r.getStudent() != null ? r.getStudent().getEnglishName() : null)
                .shiftId(r.getShift() != null ? r.getShift().getId() : null)
                .shiftName(r.getShift() != null ? r.getShift().getName() : null)
                .firstCheckIn(r.getFirstCheckIn())
                .lastCheckOut(r.getLastCheckOut())
                .inDeviceName(r.getInDevice() != null ? r.getInDevice().getName() : null)
                .outDeviceName(r.getOutDevice() != null ? r.getOutDevice().getName() : null)
                .totalWorkMinutes(r.getTotalWorkMinutes())
                .lateMinutes(r.getLateMinutes())
                .earlyLeaveMinutes(r.getEarlyLeaveMinutes())
                .overtimeMinutes(r.getOvertimeMinutes())
                .breakMinutes(r.getBreakMinutes())
                .status(r.getStatus())
                .manualAdjusted(r.isManualAdjusted())
                .remarks(r.getRemarks())
                .build();
    }
}

