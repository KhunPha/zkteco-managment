package com.zkteco.attendance.modules.personnel;

import com.zkteco.attendance.common.AppException;
import com.zkteco.attendance.common.ErrorCode;
import com.zkteco.attendance.common.PageResponse;
import com.zkteco.attendance.common.ResourceNotFoundException;
import com.zkteco.attendance.modules.organization.BranchRepository;
import com.zkteco.attendance.modules.organization.DepartmentRepository;
import com.zkteco.attendance.modules.organization.PositionRepository;
import com.zkteco.attendance.modules.personnel.dto.CreateEmployeeRequest;
import com.zkteco.attendance.modules.personnel.dto.EmployeeDto;
import com.zkteco.attendance.modules.user.UserRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;
    private final BranchRepository branchRepository;
    private final com.zkteco.attendance.modules.device.TerminalSyncService terminalSyncService;
    private final PersonnelCodeGeneratorService personnelCodeGeneratorService;
    private final com.zkteco.attendance.modules.biometric.FaceBiometricRepository faceBiometricRepository;
    private final com.zkteco.attendance.modules.device.DeviceUserRepository deviceUserRepository;
    private final com.zkteco.attendance.modules.audit.AuditLogService auditLogService;
    private final com.zkteco.attendance.modules.shift.EmployeeScheduleRepository scheduleRepository;
    private final com.zkteco.attendance.modules.shift.ShiftRepository shiftRepository;

    @Transactional(readOnly = true)
    public String getNextEmployeeCode() {
        return personnelCodeGeneratorService.generateNextUniqueCode();
    }

    @Transactional(readOnly = true)
    public String getNextEmployeeIdNumber(String staffType, String year) {
        return personnelCodeGeneratorService.generateNextIdNumber(staffType, year);
    }

    @Transactional(readOnly = true)
    public PageResponse<EmployeeDto> getEmployees(String search, Long departmentId, Long branchId, String status, Pageable pageable) {
        return getEmployees(search, departmentId, branchId, status, null, null, pageable);
    }

    @Transactional(readOnly = true)
    public PageResponse<EmployeeDto> getEmployees(String search, Long departmentId, Long branchId, String status, String staffType, Boolean isTeacher, Pageable pageable) {
        Specification<Employee> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));

            String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
            if (activeTenant != null && !activeTenant.isBlank() && !"all".equalsIgnoreCase(activeTenant)) {
                predicates.add(cb.equal(root.get("companyCode"), activeTenant.trim().toLowerCase()));
            }

            if (search != null && !search.trim().isEmpty()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("employeeCode")), pattern),
                        cb.like(cb.lower(root.get("idNumber")), pattern),
                        cb.like(cb.lower(root.get("englishName")), pattern),
                        cb.like(cb.lower(root.get("khmerName")), pattern),
                        cb.like(cb.lower(root.get("email")), pattern),
                        cb.like(cb.lower(root.get("phoneNumber")), pattern)
                ));
            }

            if (departmentId != null) {
                predicates.add(cb.equal(root.get("department").get("id"), departmentId));
            }

            if (branchId != null) {
                predicates.add(cb.equal(root.get("branch").get("id"), branchId));
            }

            if (status != null && !status.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("employmentStatus"), status.trim().toUpperCase()));
            }

            if (staffType != null && !staffType.trim().isEmpty() && !"ALL".equalsIgnoreCase(staffType.trim())) {
                predicates.add(cb.equal(cb.upper(root.get("staffType")), staffType.trim().toUpperCase()));
            } else if (isTeacher != null) {
                predicates.add(cb.equal(root.get("isTeacher"), isTeacher));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Employee> page = employeeRepository.findAll(spec, pageable);
        List<com.zkteco.attendance.modules.shift.EmployeeSchedule> activeSchedules = scheduleRepository.findAllActiveSchedules(java.time.LocalDate.now());
        java.util.Map<Long, String> empShiftMap = new java.util.HashMap<>();
        for (com.zkteco.attendance.modules.shift.EmployeeSchedule s : activeSchedules) {
            if (s.getEmployee() != null && s.getShift() != null) {
                empShiftMap.put(s.getEmployee().getId(), s.getShift().getName());
            }
        }
        List<EmployeeDto> dtos = page.getContent().stream()
                .map(e -> toDto(e, empShiftMap.get(e.getId())))
                .collect(Collectors.toList());
        return PageResponse.of(page, dtos);
    }

    @Transactional(readOnly = true)
    public EmployeeDto getEmployeeById(Long id) {
        Employee emp = employeeRepository.findById(id)
                .filter(e -> e.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", id));
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if (!"all".equalsIgnoreCase(activeTenant) && !activeTenant.equalsIgnoreCase(emp.getCompanyCode())) {
            throw new ResourceNotFoundException("Employee", "id", id);
        }
        return toDto(emp);
    }

    @Transactional
    public EmployeeDto createEmployee(CreateEmployeeRequest request) {
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if ("all".equalsIgnoreCase(activeTenant)) activeTenant = "default";

        String empCode = request.getEmployeeCode();
        if (empCode == null || empCode.trim().isEmpty()) {
            empCode = personnelCodeGeneratorService.generateNextUniqueCode();
            while (employeeRepository.existsByCompanyCodeAndEmployeeCodeAndDeletedAtIsNull(activeTenant, empCode)) {
                try {
                    empCode = String.valueOf(Long.parseLong(empCode) + 1);
                } catch (Exception e) {
                    empCode = personnelCodeGeneratorService.generateNextUniqueCode();
                }
            }
        } else {
            // Enforce purely numeric codes (no letters or special characters)
            empCode = empCode.trim().replaceAll("[^0-9]", "");
            if (empCode.isEmpty()) {
                empCode = personnelCodeGeneratorService.generateNextUniqueCode();
            }
            if (employeeRepository.existsByCompanyCodeAndEmployeeCodeAndDeletedAtIsNull(activeTenant, empCode)) {
                throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Employee code already exists in your company: " + empCode);
            }
        }

        String staffType = request.getStaffType();
        if (staffType == null || staffType.trim().isEmpty()) {
            staffType = Boolean.TRUE.equals(request.getIsTeacher()) ? "TEACHER" : "EMPLOYEE";
        }
        boolean isTeacher = "TEACHER".equalsIgnoreCase(staffType) || Boolean.TRUE.equals(request.getIsTeacher());

        String idNumber = request.getIdNumber();
        if (idNumber == null || idNumber.trim().isEmpty() || idNumber.trim().matches("^[0-9]{1,4}$") || idNumber.trim().matches("^(?i)FBIS(S|T)?[0-9]{0,2}$")) {
            String yr = (idNumber != null && idNumber.replaceAll("[^0-9]", "").length() >= 2)
                    ? idNumber
                    : (request.getEmploymentStartDate() != null ? String.valueOf(request.getEmploymentStartDate().getYear() % 100) : null);
            idNumber = personnelCodeGeneratorService.generateNextIdNumber(isTeacher ? "TEACHER" : "EMPLOYEE", yr);
        } else {
            idNumber = idNumber.trim();
        }

        Employee emp = Employee.builder()
                .employeeCode(empCode)
                .idNumber(idNumber)
                .khmerName(request.getKhmerName())
                .englishName(request.getEnglishName().trim())
                .gender(request.getGender().toUpperCase())
                .dateOfBirth(request.getDateOfBirth())
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .address(request.getAddress())
                .employmentType(request.getEmploymentType() != null ? request.getEmploymentType() : "FULL_TIME")
                .employmentStartDate(request.getEmploymentStartDate())
                .employmentEndDate(request.getEmploymentEndDate())
                .employmentStatus(request.getEmploymentStatus() != null ? request.getEmploymentStatus() : "ACTIVE")
                .profileImageUrl(request.getProfileImageUrl())
                .companyCode(activeTenant)
                .staffType(isTeacher ? "TEACHER" : "EMPLOYEE")
                .isTeacher(isTeacher)
                .build();

        if (request.getUserId() != null) {
            userRepository.findById(request.getUserId()).ifPresent(emp::setUser);
        }
        if (request.getDepartmentId() != null) {
            departmentRepository.findById(request.getDepartmentId()).ifPresent(emp::setDepartment);
        }
        if (request.getPositionId() != null) {
            positionRepository.findById(request.getPositionId()).ifPresent(emp::setPosition);
        }
        if (request.getBranchId() != null) {
            branchRepository.findById(request.getBranchId()).ifPresent(emp::setBranch);
        }
        if (request.getSupervisorId() != null) {
            employeeRepository.findById(request.getSupervisorId()).ifPresent(emp::setSupervisor);
        }

        Employee saved = employeeRepository.save(emp);

        if (request.getShiftId() != null) {
            shiftRepository.findById(request.getShiftId()).ifPresent(shift -> {
                com.zkteco.attendance.modules.shift.EmployeeSchedule schedule = com.zkteco.attendance.modules.shift.EmployeeSchedule.builder()
                        .employee(saved)
                        .shift(shift)
                        .effectiveFrom(saved.getEmploymentStartDate() != null ? saved.getEmploymentStartDate() : java.time.LocalDate.now())
                        .monday(true).tuesday(true).wednesday(true).thursday(true).friday(true).saturday(false).sunday(false)
                        .build();
                scheduleRepository.save(schedule);
            });
        }

        try {
            terminalSyncService.syncEmployee(saved, request.getCardNumber());
        } catch (Exception ex) {
            log.warn("Terminal sync hook failed for employee {}: {}", saved.getEmployeeCode(), ex.getMessage());
        }
        isTeacher = saved.isTeacherPerson();
        String actionType = isTeacher ? "CREATE_TEACHER" : "CREATE_EMPLOYEE";
        String entityType = isTeacher ? "TEACHER" : "EMPLOYEE";
        auditLogService.record(actionType, entityType, String.valueOf(saved.getId()), 
                "Created " + (isTeacher ? "teacher " : "employee ") + saved.getEnglishName() + " (PIN/Code: " + saved.getEmployeeCode() + ", Company: " + saved.getCompanyCode() + ")");
        return toDto(saved);
    }

    @Transactional
    public EmployeeDto updateEmployee(Long id, CreateEmployeeRequest request) {
        Employee emp = employeeRepository.findById(id)
                .filter(e -> e.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", id));

        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if (!"all".equalsIgnoreCase(activeTenant) && !activeTenant.equalsIgnoreCase(emp.getCompanyCode())) {
            throw new ResourceNotFoundException("Employee", "id", id);
        }

        if (request.getEmployeeCode() != null && !request.getEmployeeCode().trim().isEmpty()) {
            String newCode = request.getEmployeeCode().trim().replaceAll("[^0-9]", "");
            if (!newCode.isEmpty() && !newCode.equalsIgnoreCase(emp.getEmployeeCode())) {
                String targetComp = emp.getCompanyCode() != null ? emp.getCompanyCode() : "default";
                if (employeeRepository.existsByCompanyCodeAndEmployeeCodeAndDeletedAtIsNull(targetComp, newCode)) {
                    throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Employee code already exists in your company: " + newCode);
                }
                String oldCode = emp.getEmployeeCode();
                emp.setEmployeeCode(newCode);

                // Seamlessly keep FaceBiometrics and Device Users in sync with updated employee code
                try {
                    faceBiometricRepository.findByEmployeeId(emp.getId()).ifPresent(fb -> {
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
                    log.warn("Notice: Syncing face biometrics/device users on code change: {}", syncErr.getMessage());
                }
            }
        }

        emp.setKhmerName(request.getKhmerName());
        emp.setEnglishName(request.getEnglishName().trim());
        emp.setGender(request.getGender().toUpperCase());
        emp.setDateOfBirth(request.getDateOfBirth());
        emp.setEmail(request.getEmail());
        emp.setPhoneNumber(request.getPhoneNumber());
        emp.setAddress(request.getAddress());
        if (request.getEmploymentType() != null) emp.setEmploymentType(request.getEmploymentType());
        if (request.getEmploymentStartDate() != null) emp.setEmploymentStartDate(request.getEmploymentStartDate());
        emp.setEmploymentEndDate(request.getEmploymentEndDate());
        if (request.getEmploymentStatus() != null) emp.setEmploymentStatus(request.getEmploymentStatus());
        if (request.getProfileImageUrl() != null) emp.setProfileImageUrl(request.getProfileImageUrl());

        if (request.getUserId() != null) {
            emp.setUser(userRepository.findById(request.getUserId()).orElse(null));
        }
        if (request.getDepartmentId() != null) {
            emp.setDepartment(departmentRepository.findById(request.getDepartmentId()).orElse(null));
        }
        if (request.getPositionId() != null) {
            emp.setPosition(positionRepository.findById(request.getPositionId()).orElse(null));
        }
        if (request.getBranchId() != null) {
            emp.setBranch(branchRepository.findById(request.getBranchId()).orElse(null));
        }
        if (request.getSupervisorId() != null) {
            emp.setSupervisor(employeeRepository.findById(request.getSupervisorId()).orElse(null));
        }

        if (request.getStaffType() != null && !request.getStaffType().trim().isEmpty()) {
            boolean isT = "TEACHER".equalsIgnoreCase(request.getStaffType().trim()) || Boolean.TRUE.equals(request.getIsTeacher());
            emp.setStaffType(isT ? "TEACHER" : "EMPLOYEE");
            emp.setIsTeacher(isT);
        } else if (request.getIsTeacher() != null) {
            emp.setStaffType(request.getIsTeacher() ? "TEACHER" : "EMPLOYEE");
            emp.setIsTeacher(request.getIsTeacher());
        }

        if (request.getIdNumber() != null && !request.getIdNumber().trim().isEmpty()) {
            emp.setIdNumber(request.getIdNumber().trim());
        }

        Employee saved = employeeRepository.save(emp);

        if (request.getShiftId() != null) {
            shiftRepository.findById(request.getShiftId()).ifPresent(shift -> {
                com.zkteco.attendance.modules.shift.EmployeeSchedule schedule = com.zkteco.attendance.modules.shift.EmployeeSchedule.builder()
                        .employee(saved)
                        .shift(shift)
                        .effectiveFrom(saved.getEmploymentStartDate() != null ? saved.getEmploymentStartDate() : java.time.LocalDate.now())
                        .monday(true).tuesday(true).wednesday(true).thursday(true).friday(true).saturday(false).sunday(false)
                        .build();
                scheduleRepository.save(schedule);
            });
        }

        try {
            terminalSyncService.syncEmployee(saved, request.getCardNumber());
        } catch (Exception ex) {
            log.warn("Terminal sync hook failed for employee {}: {}", saved.getEmployeeCode(), ex.getMessage());
        }
        auditLogService.record("UPDATE_EMPLOYEE", "EMPLOYEE", String.valueOf(saved.getId()), 
                "Updated employee " + saved.getEnglishName() + " (PIN/Code: " + saved.getEmployeeCode() + ", Company: " + saved.getCompanyCode() + ")");
        return toDto(saved);
    }

    @Transactional
    public EmployeeDto updateEmployeeStatus(Long id, String status) {
        Employee emp = employeeRepository.findById(id)
                .filter(e -> e.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", id));

        emp.setEmploymentStatus(status.toUpperCase().trim());
        Employee saved = employeeRepository.save(emp);

        try {
            terminalSyncService.syncEmployee(saved, null);
        } catch (Exception ex) {
            log.warn("Terminal sync hook failed: {}", ex.getMessage());
        }
        auditLogService.record("UPDATE_EMPLOYEE_STATUS", "EMPLOYEE", String.valueOf(saved.getId()),
                "Changed status to " + status + " for " + saved.getEnglishName() + " (" + saved.getEmployeeCode() + ")");
        return toDto(saved);
    }

    @Transactional
    public void deleteEmployee(Long id) {
        Employee emp = employeeRepository.findById(id)
                .filter(e -> e.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", id));

        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if (!"all".equalsIgnoreCase(activeTenant) && !activeTenant.equalsIgnoreCase(emp.getCompanyCode())) {
            throw new ResourceNotFoundException("Employee", "id", id);
        }

        String originalPin = emp.getEmployeeCode();
        emp.setDeletedAt(Instant.now());
        emp.setEmploymentStatus("TERMINATED");
        if (emp.getEmployeeCode() != null && !emp.getEmployeeCode().contains("_del_")) {
            emp.setEmployeeCode(emp.getEmployeeCode() + "_del_" + emp.getId());
        }
        if (emp.getIdNumber() != null && !emp.getIdNumber().contains("_del_")) {
            emp.setIdNumber(emp.getIdNumber() + "_del_" + emp.getId());
        }
        employeeRepository.save(emp);
        try {
            scheduleRepository.deleteByEmployeeId(emp.getId());
            deviceUserRepository.deleteByEmployeeId(emp.getId());
            if (originalPin != null && !originalPin.contains("_del_")) {
                terminalSyncService.deleteUserFromPhysicalMachinesAsync(originalPin);
            }
        } catch (Exception ex) {
            log.warn("Terminal delete or schedule cleanup failed: {}", ex.getMessage());
        }
        auditLogService.record("DELETE_EMPLOYEE", "EMPLOYEE", String.valueOf(emp.getId()),
                "Deleted employee " + emp.getEnglishName() + " (PIN: " + emp.getEmployeeCode() + ", Company: " + emp.getCompanyCode() + ")");
    }

    public EmployeeDto toDto(Employee emp) {
        String shiftName = null;
        if (emp != null && emp.getId() != null) {
            List<com.zkteco.attendance.modules.shift.EmployeeSchedule> active = scheduleRepository.findActiveSchedules(emp.getId(), java.time.LocalDate.now());
            if (!active.isEmpty() && active.get(0).getShift() != null) {
                shiftName = active.get(0).getShift().getName();
            }
        }
        return toDto(emp, shiftName);
    }

    public EmployeeDto toDto(Employee emp, String shiftName) {
        if (emp == null) return null;
        return EmployeeDto.builder()
                .id(emp.getId())
                .userId(emp.getUser() != null ? emp.getUser().getId() : null)
                .employeeCode(emp.getEmployeeCode())
                .idNumber(emp.getIdNumber())
                .khmerName(emp.getKhmerName())
                .englishName(emp.getEnglishName())
                .gender(emp.getGender())
                .dateOfBirth(emp.getDateOfBirth())
                .email(emp.getEmail())
                .phoneNumber(emp.getPhoneNumber())
                .address(emp.getAddress())
                .departmentId(emp.getDepartment() != null ? emp.getDepartment().getId() : null)
                .departmentName(emp.getDepartment() != null ? emp.getDepartment().getName() : null)
                .positionId(emp.getPosition() != null ? emp.getPosition().getId() : null)
                .positionTitle(emp.getPosition() != null ? emp.getPosition().getTitle() : null)
                .branchId(emp.getBranch() != null ? emp.getBranch().getId() : null)
                .branchName(emp.getBranch() != null ? emp.getBranch().getName() : null)
                .employmentType(emp.getEmploymentType())
                .employmentStartDate(emp.getEmploymentStartDate())
                .employmentEndDate(emp.getEmploymentEndDate())
                .employmentStatus(emp.getEmploymentStatus())
                .profileImageUrl(emp.getProfileImageUrl())
                .supervisorId(emp.getSupervisor() != null ? emp.getSupervisor().getId() : null)
                .supervisorName(emp.getSupervisor() != null ? emp.getSupervisor().getEnglishName() : null)
                .companyCode(emp.getCompanyCode())
                .staffType(emp.getStaffType() != null ? emp.getStaffType() : (Boolean.TRUE.equals(emp.getIsTeacher()) ? "TEACHER" : "EMPLOYEE"))
                .isTeacher(Boolean.TRUE.equals(emp.getIsTeacher()) || "TEACHER".equalsIgnoreCase(emp.getStaffType()))
                .scheduleAssigned(shiftName != null)
                .currentShiftName(shiftName)
                .build();
    }
}

