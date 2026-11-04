package com.zkteco.attendance.modules.leave;

import com.zkteco.attendance.common.AppException;
import com.zkteco.attendance.common.ErrorCode;
import com.zkteco.attendance.common.PageResponse;
import com.zkteco.attendance.common.ResourceNotFoundException;
import com.zkteco.attendance.modules.leave.dto.*;
import com.zkteco.attendance.modules.personnel.Employee;
import com.zkteco.attendance.modules.personnel.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaveService {

    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;
    private final EmployeeRepository employeeRepository;

    // Leave Types
    @Transactional(readOnly = true)
    public List<LeaveTypeDto> getAllLeaveTypes() {
        return leaveTypeRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public LeaveTypeDto createLeaveType(CreateLeaveTypeRequest request) {
        if (leaveTypeRepository.findByCode(request.getCode()).isPresent()) {
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Leave type code already exists: " + request.getCode());
        }

        LeaveType lt = LeaveType.builder()
                .code(request.getCode().trim().toUpperCase())
                .name(request.getName().trim())
                .description(request.getDescription())
                .paid(request.getPaid() != null ? request.getPaid() : true)
                .defaultDaysPerYear(request.getDefaultDaysPerYear() != null ? request.getDefaultDaysPerYear() : 18)
                .requiresApproval(request.getRequiresApproval() != null ? request.getRequiresApproval() : true)
                .active(request.getActive() != null ? request.getActive() : true)
                .build();

        return toDto(leaveTypeRepository.save(lt));
    }

    // Leave Requests
    @Transactional(readOnly = true)
    public PageResponse<LeaveRequestDto> getLeaveRequests(String status, Pageable pageable) {
        String filterStatus = (status != null && !status.trim().isEmpty()) ? status.trim().toUpperCase() : "PENDING";
        Page<LeaveRequest> page = leaveRequestRepository.findByStatusOrderByCreatedAtDesc(filterStatus, pageable);
        List<LeaveRequestDto> dtos = page.getContent().stream().map(this::toDto).collect(Collectors.toList());
        return PageResponse.of(page, dtos);
    }

    @Transactional
    public LeaveRequestDto submitLeaveRequest(CreateLeaveRequest request) {
        Employee emp = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", request.getEmployeeId()));

        LeaveType lt = leaveTypeRepository.findById(request.getLeaveTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("LeaveType", "id", request.getLeaveTypeId()));

        BigDecimal days = request.getTotalDays();
        if (days == null || days.compareTo(BigDecimal.ZERO) <= 0) {
            long diff = ChronoUnit.DAYS.between(request.getStartDate(), request.getEndDate()) + 1;
            days = BigDecimal.valueOf(Math.max(1, diff));
        }

        LeaveRequest lr = LeaveRequest.builder()
                .employee(emp)
                .leaveType(lt)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .totalDays(days)
                .reason(request.getReason())
                .status("PENDING")
                .build();

        return toDto(leaveRequestRepository.save(lr));
    }

    @Transactional
    public LeaveRequestDto approveLeave(Long id, Long approverId, ApproveLeaveRequest request) {
        LeaveRequest lr = leaveRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveRequest", "id", id));

        if (!"PENDING".equalsIgnoreCase(lr.getStatus())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Leave request has already been processed");
        }

        Employee approver = null;
        if (approverId != null) {
            approver = employeeRepository.findById(approverId).orElse(null);
        }

        lr.setApprover(approver);
        lr.setApprovedAt(Instant.now());

        if (Boolean.TRUE.equals(request.getApproved())) {
            lr.setStatus("APPROVED");

            // Deduct balance
            int year = lr.getStartDate().getYear();
            leaveBalanceRepository.findByEmployeeIdAndLeaveTypeIdAndYear(lr.getEmployee().getId(), lr.getLeaveType().getId(), year)
                    .ifPresent(b -> {
                        b.setUsedDays(b.getUsedDays().add(lr.getTotalDays()));
                        b.setRemainingDays(b.getTotalDays().subtract(b.getUsedDays()));
                        leaveBalanceRepository.save(b);
                    });
        } else {
            lr.setStatus("REJECTED");
            lr.setRejectionReason(request.getRejectionReason());
        }

        return toDto(leaveRequestRepository.save(lr));
    }

    private LeaveTypeDto toDto(LeaveType lt) {
        return LeaveTypeDto.builder()
                .id(lt.getId())
                .code(lt.getCode())
                .name(lt.getName())
                .description(lt.getDescription())
                .paid(lt.isPaid())
                .defaultDaysPerYear(lt.getDefaultDaysPerYear())
                .requiresApproval(lt.isRequiresApproval())
                .active(lt.isActive())
                .build();
    }

    private LeaveRequestDto toDto(LeaveRequest lr) {
        return LeaveRequestDto.builder()
                .id(lr.getId())
                .employeeId(lr.getEmployee().getId())
                .employeeCode(lr.getEmployee().getEmployeeCode())
                .employeeName(lr.getEmployee().getEnglishName())
                .leaveTypeId(lr.getLeaveType().getId())
                .leaveTypeCode(lr.getLeaveType().getCode())
                .leaveTypeName(lr.getLeaveType().getName())
                .startDate(lr.getStartDate())
                .endDate(lr.getEndDate())
                .totalDays(lr.getTotalDays())
                .reason(lr.getReason())
                .status(lr.getStatus())
                .approverId(lr.getApprover() != null ? lr.getApprover().getId() : null)
                .approverName(lr.getApprover() != null ? lr.getApprover().getEnglishName() : null)
                .approvedAt(lr.getApprovedAt())
                .rejectionReason(lr.getRejectionReason())
                .createdAt(lr.getCreatedAt())
                .build();
    }
}

