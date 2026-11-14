package com.zkteco.attendance.modules.attendance;

import com.zkteco.attendance.common.AppException;
import com.zkteco.attendance.common.ErrorCode;
import com.zkteco.attendance.common.PageResponse;
import com.zkteco.attendance.common.ResourceNotFoundException;
import com.zkteco.attendance.modules.attendance.dto.ApproveCorrectionRequest;
import com.zkteco.attendance.modules.attendance.dto.AttendanceCorrectionDto;
import com.zkteco.attendance.modules.attendance.dto.CreateCorrectionRequest;
import com.zkteco.attendance.modules.personnel.Employee;
import com.zkteco.attendance.modules.personnel.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AttendanceCorrectionService {

    private final AttendanceCorrectionRepository correctionRepository;
    private final AttendanceRecordRepository recordRepository;
    private final EmployeeRepository employeeRepository;
    private final com.zkteco.attendance.modules.audit.AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public PageResponse<AttendanceCorrectionDto> getCorrections(String status, Pageable pageable) {
        String filterStatus = (status != null && !status.trim().isEmpty() && !"ALL".equalsIgnoreCase(status))
                ? status.trim().toUpperCase() : null;
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        boolean isAll = "all".equalsIgnoreCase(activeTenant);

        Page<AttendanceCorrection> page;
        if (isAll) {
            page = filterStatus != null
                    ? correctionRepository.findByStatusOrderByCreatedAtDesc(filterStatus, pageable)
                    : correctionRepository.findAllByOrderByCreatedAtDesc(pageable);
        } else {
            String tenant = activeTenant.trim().toLowerCase();
            page = filterStatus != null
                    ? correctionRepository.findByEmployeeCompanyCodeAndStatusOrderByCreatedAtDesc(tenant, filterStatus, pageable)
                    : correctionRepository.findByEmployeeCompanyCodeOrderByCreatedAtDesc(tenant, pageable);
        }

        List<AttendanceCorrectionDto> dtos = page.getContent().stream().map(this::toDto).collect(Collectors.toList());
        return PageResponse.of(page, dtos);
    }

    @Transactional
    public AttendanceCorrectionDto submitCorrection(CreateCorrectionRequest request) {
        Employee emp = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", request.getEmployeeId()));
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if (!"all".equalsIgnoreCase(activeTenant) && !activeTenant.equalsIgnoreCase(emp.getCompanyCode())) {
            throw new ResourceNotFoundException("Employee", "id", request.getEmployeeId());
        }

        AttendanceRecord record = null;
        if (request.getAttendanceRecordId() != null) {
            record = recordRepository.findById(request.getAttendanceRecordId()).orElse(null);
        } else {
            record = recordRepository.findByEmployeeIdAndAttendanceDate(emp.getId(), request.getAttendanceDate()).orElse(null);
        }

        AttendanceCorrection correction = AttendanceCorrection.builder()
                .employee(emp)
                .attendanceRecord(record)
                .attendanceDate(request.getAttendanceDate())
                .originalCheckIn(record != null ? record.getFirstCheckIn() : null)
                .originalCheckOut(record != null ? record.getLastCheckOut() : null)
                .requestedCheckIn(request.getRequestedCheckIn())
                .requestedCheckOut(request.getRequestedCheckOut())
                .reason(request.getReason())
                .status("PENDING")
                .build();

        return toDto(correctionRepository.save(correction));
    }

    @Transactional
    public AttendanceCorrectionDto approveCorrection(Long id, Long approverId, ApproveCorrectionRequest request) {
        AttendanceCorrection correction = correctionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AttendanceCorrection", "id", id));
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if (!"all".equalsIgnoreCase(activeTenant) && !activeTenant.equalsIgnoreCase(correction.getEmployee().getCompanyCode())) {
            throw new ResourceNotFoundException("AttendanceCorrection", "id", id);
        }

        if (!"PENDING".equalsIgnoreCase(correction.getStatus())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Correction request has already been processed");
        }

        Employee approver = null;
        if (approverId != null) {
            approver = employeeRepository.findById(approverId).orElse(null);
        }

        if (Boolean.TRUE.equals(request.getApproved())) {
            correction.setStatus("APPROVED");
            correction.setApprovedAt(Instant.now());
            correction.setApprover(approver);

            // Update attendance record without modifying raw device logs
            AttendanceRecord record = correction.getAttendanceRecord();
            if (record == null) {
                record = recordRepository.findByEmployeeIdAndAttendanceDate(
                        correction.getEmployee().getId(), correction.getAttendanceDate()
                ).orElseGet(() -> AttendanceRecord.builder()
                        .employee(correction.getEmployee())
                        .attendanceDate(correction.getAttendanceDate())
                        .companyCode(correction.getEmployee().getCompanyCode() != null ? correction.getEmployee().getCompanyCode() : activeTenant)
                        .build());
            }

            record.setFirstCheckIn(correction.getRequestedCheckIn());
            record.setLastCheckOut(correction.getRequestedCheckOut());
            record.setManualAdjusted(true);
            record.setStatus("PRESENT");
            record.setRemarks("Adjusted via approved correction #" + correction.getId());
            recordRepository.save(record);

        } else {
            correction.setStatus("REJECTED");
            correction.setApprovedAt(Instant.now());
            correction.setApprover(approver);
            correction.setRejectionReason(request.getRejectionReason());
        }

        AttendanceCorrection saved = correctionRepository.save(correction);
        auditLogService.record("REVIEW_ATTENDANCE_CORRECTION", "ATTENDANCE_CORRECTION", String.valueOf(saved.getId()),
                "Decision: " + saved.getStatus() + " for " + saved.getEmployee().getEnglishName() + " on " + saved.getAttendanceDate()
                + (saved.getRejectionReason() != null ? " (Reason: " + saved.getRejectionReason() + ")" : ""));
        return toDto(saved);
    }

    private AttendanceCorrectionDto toDto(AttendanceCorrection c) {
        return AttendanceCorrectionDto.builder()
                .id(c.getId())
                .employeeId(c.getEmployee().getId())
                .employeeCode(c.getEmployee().getEmployeeCode())
                .employeeName(c.getEmployee().getEnglishName())
                .attendanceRecordId(c.getAttendanceRecord() != null ? c.getAttendanceRecord().getId() : null)
                .attendanceDate(c.getAttendanceDate())
                .originalCheckIn(c.getOriginalCheckIn())
                .originalCheckOut(c.getOriginalCheckOut())
                .requestedCheckIn(c.getRequestedCheckIn())
                .requestedCheckOut(c.getRequestedCheckOut())
                .reason(c.getReason())
                .status(c.getStatus())
                .approverId(c.getApprover() != null ? c.getApprover().getId() : null)
                .approverName(c.getApprover() != null ? c.getApprover().getEnglishName() : null)
                .approvedAt(c.getApprovedAt())
                .rejectionReason(c.getRejectionReason())
                .createdAt(c.getCreatedAt())
                .build();
    }
}

