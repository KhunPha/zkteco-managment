package com.zkteco.attendance.modules.shift;

import com.zkteco.attendance.common.ResourceNotFoundException;
import com.zkteco.attendance.modules.personnel.Employee;
import com.zkteco.attendance.modules.personnel.EmployeeRepository;
import com.zkteco.attendance.modules.personnel.Student;
import com.zkteco.attendance.modules.personnel.StudentRepository;
import com.zkteco.attendance.modules.shift.dto.AssignScheduleRequest;
import com.zkteco.attendance.modules.shift.dto.BatchAssignScheduleRequest;
import com.zkteco.attendance.modules.shift.dto.ScheduleDto;
import com.zkteco.attendance.modules.shift.dto.UnassignedScheduleSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScheduleService {

    private final EmployeeScheduleRepository scheduleRepository;
    private final EmployeeRepository employeeRepository;
    private final StudentRepository studentRepository;
    private final ShiftRepository shiftRepository;

    @jakarta.annotation.PostConstruct
    @Transactional
    public void purgeDeletedPersonnelSchedulesOnStartup() {
        try {
            int purged = scheduleRepository.purgeDeletedPersonnelSchedules();
            if (purged > 0) {
                org.slf4j.LoggerFactory.getLogger(ScheduleService.class)
                        .info("Cleaned up {} orphaned/deleted personnel schedules", purged);
            }
        } catch (Exception ex) {
            org.slf4j.LoggerFactory.getLogger(ScheduleService.class)
                    .warn("Startup schedule purge error: {}", ex.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<ScheduleDto> getSchedulesByEmployee(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", employeeId));
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if (!"all".equalsIgnoreCase(activeTenant) && !activeTenant.equalsIgnoreCase(employee.getCompanyCode())) {
            throw new ResourceNotFoundException("Employee", "id", employeeId);
        }
        return scheduleRepository.findByEmployeeId(employeeId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ScheduleDto> getSchedulesByStudent(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if (!"all".equalsIgnoreCase(activeTenant) && !activeTenant.equalsIgnoreCase(student.getCompanyCode())) {
            throw new ResourceNotFoundException("Student", "id", studentId);
        }
        return scheduleRepository.findByStudentId(studentId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ScheduleDto> getAllSchedules() {
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        String tenantParam = ("all".equalsIgnoreCase(activeTenant) || activeTenant == null || activeTenant.isBlank())
                ? "all"
                : activeTenant.trim().toLowerCase();
        List<EmployeeSchedule> list = scheduleRepository.findAllByTenantCompanyCode(tenantParam);
        return list.stream()
                .filter(s -> {
                    if (s.getEmployee() != null) {
                        return s.getEmployee().getDeletedAt() == null &&
                               !"TERMINATED".equalsIgnoreCase(s.getEmployee().getEmploymentStatus());
                    }
                    if (s.getStudent() != null) {
                        return s.getStudent().getDeletedAt() == null &&
                               !"WITHDRAWN".equalsIgnoreCase(s.getStudent().getStatus());
                    }
                    return false;
                })
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UnassignedScheduleSummaryDto getUnassignedSummary() {
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        boolean isAll = "all".equalsIgnoreCase(activeTenant);

        List<Employee> allEmployees = isAll
                ? employeeRepository.findByDeletedAtIsNull()
                : employeeRepository.findByCompanyCodeAndDeletedAtIsNull(activeTenant.trim().toLowerCase());

        List<Student> allStudents = isAll
                ? studentRepository.findByDeletedAtIsNull()
                : studentRepository.findByCompanyCodeAndDeletedAtIsNull(activeTenant.trim().toLowerCase());

        List<Employee> activeEmpsOnly = allEmployees.stream()
                .filter(e -> "ACTIVE".equalsIgnoreCase(e.getEmploymentStatus()) || "PROBATION".equalsIgnoreCase(e.getEmploymentStatus()))
                .filter(e -> !Boolean.TRUE.equals(e.getIsTeacher()) && !"TEACHER".equalsIgnoreCase(e.getStaffType()))
                .collect(Collectors.toList());

        List<Employee> activeTeachersOnly = allEmployees.stream()
                .filter(e -> "ACTIVE".equalsIgnoreCase(e.getEmploymentStatus()) || "PROBATION".equalsIgnoreCase(e.getEmploymentStatus()))
                .filter(e -> Boolean.TRUE.equals(e.getIsTeacher()) || "TEACHER".equalsIgnoreCase(e.getStaffType()))
                .collect(Collectors.toList());

        List<Student> activeStudentsOnly = allStudents.stream()
                .filter(s -> "ACTIVE".equalsIgnoreCase(s.getStatus()) || s.getStatus() == null)
                .collect(Collectors.toList());

        Set<Long> scheduledEmpIds = scheduleRepository.findEmployeeIdsWithActiveSchedule();
        Set<Long> scheduledStuIds = scheduleRepository.findStudentIdsWithActiveSchedule();

        List<UnassignedScheduleSummaryDto.UnassignedPersonItem> unassignedEmps = new ArrayList<>();
        for (Employee e : activeEmpsOnly) {
            if (!scheduledEmpIds.contains(e.getId())) {
                unassignedEmps.add(UnassignedScheduleSummaryDto.UnassignedPersonItem.builder()
                        .id(e.getId())
                        .code(e.getEmployeeCode())
                        .idNumber(e.getIdNumber())
                        .name(e.getEnglishName())
                        .personnelType("EMPLOYEE")
                        .departmentOrClass(e.getDepartment() != null ? e.getDepartment().getName() : "-")
                        .branchName(e.getBranch() != null ? e.getBranch().getName() : "-")
                        .build());
            }
        }

        List<UnassignedScheduleSummaryDto.UnassignedPersonItem> unassignedTeachers = new ArrayList<>();
        for (Employee t : activeTeachersOnly) {
            if (!scheduledEmpIds.contains(t.getId())) {
                unassignedTeachers.add(UnassignedScheduleSummaryDto.UnassignedPersonItem.builder()
                        .id(t.getId())
                        .code(t.getEmployeeCode())
                        .idNumber(t.getIdNumber())
                        .name(t.getEnglishName())
                        .personnelType("TEACHER")
                        .departmentOrClass(t.getDepartment() != null ? t.getDepartment().getName() : "-")
                        .branchName(t.getBranch() != null ? t.getBranch().getName() : "-")
                        .build());
            }
        }

        List<UnassignedScheduleSummaryDto.UnassignedPersonItem> unassignedStudents = new ArrayList<>();
        for (Student s : activeStudentsOnly) {
            if (!scheduledStuIds.contains(s.getId())) {
                String deptClass = "";
                if (s.getClassName() != null && !s.getClassName().isBlank()) {
                    deptClass = s.getClassName();
                }
                if (s.getGrade() != null && !s.getGrade().isBlank()) {
                    deptClass = deptClass.isEmpty() ? s.getGrade() : deptClass + " (" + s.getGrade() + ")";
                }
                if (deptClass.isEmpty()) deptClass = "-";

                unassignedStudents.add(UnassignedScheduleSummaryDto.UnassignedPersonItem.builder()
                        .id(s.getId())
                        .code(s.getStudentCode())
                        .idNumber(s.getIdNumber())
                        .name(s.getEnglishName())
                        .personnelType("STUDENT")
                        .departmentOrClass(deptClass)
                        .branchName(s.getBranch() != null ? s.getBranch().getName() : "-")
                        .build());
            }
        }

        return UnassignedScheduleSummaryDto.builder()
                .unassignedEmployeesCount(unassignedEmps.size())
                .unassignedTeachersCount(unassignedTeachers.size())
                .unassignedStudentsCount(unassignedStudents.size())
                .totalActiveEmployees(activeEmpsOnly.size())
                .totalActiveTeachers(activeTeachersOnly.size())
                .totalActiveStudents(activeStudentsOnly.size())
                .unassignedEmployees(unassignedEmps)
                .unassignedTeachers(unassignedTeachers)
                .unassignedStudents(unassignedStudents)
                .build();
    }

    @Transactional
    public ScheduleDto assignSchedule(AssignScheduleRequest request) {
        Shift shift = shiftRepository.findById(request.getShiftId())
                .orElseThrow(() -> new ResourceNotFoundException("Shift", "id", request.getShiftId()));

        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        boolean isAll = "all".equalsIgnoreCase(activeTenant);
        if (!isAll && !activeTenant.equalsIgnoreCase(shift.getCompanyCode())) {
            throw new ResourceNotFoundException("Shift", "id", request.getShiftId());
        }

        EmployeeSchedule.EmployeeScheduleBuilder b = EmployeeSchedule.builder()
                .shift(shift)
                .effectiveFrom(request.getEffectiveFrom())
                .effectiveTo(request.getEffectiveTo())
                .monday(request.getMonday() != null ? request.getMonday() : true)
                .tuesday(request.getTuesday() != null ? request.getTuesday() : true)
                .wednesday(request.getWednesday() != null ? request.getWednesday() : true)
                .thursday(request.getThursday() != null ? request.getThursday() : true)
                .friday(request.getFriday() != null ? request.getFriday() : true)
                .saturday(request.getSaturday() != null ? request.getSaturday() : false)
                .sunday(request.getSunday() != null ? request.getSunday() : false);

        if (request.getEmployeeId() != null) {
            Employee employee = employeeRepository.findById(request.getEmployeeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", request.getEmployeeId()));
            if (!isAll && !activeTenant.equalsIgnoreCase(employee.getCompanyCode())) {
                throw new ResourceNotFoundException("Employee", "id", request.getEmployeeId());
            }
            b.employee(employee);
        } else if (request.getStudentId() != null) {
            Student student = studentRepository.findById(request.getStudentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Student", "id", request.getStudentId()));
            if (!isAll && !activeTenant.equalsIgnoreCase(student.getCompanyCode())) {
                throw new ResourceNotFoundException("Student", "id", request.getStudentId());
            }
            b.student(student);
        } else {
            throw new IllegalArgumentException("Either employeeId or studentId must be provided");
        }

        return toDto(scheduleRepository.save(b.build()));
    }

    @Transactional
    public List<ScheduleDto> assignBatchSchedule(BatchAssignScheduleRequest request) {
        Shift shift = shiftRepository.findById(request.getShiftId())
                .orElseThrow(() -> new ResourceNotFoundException("Shift", "id", request.getShiftId()));

        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        boolean isAll = "all".equalsIgnoreCase(activeTenant);
        if (!isAll && !activeTenant.equalsIgnoreCase(shift.getCompanyCode())) {
            throw new ResourceNotFoundException("Shift", "id", request.getShiftId());
        }

        Set<Long> targetEmployeeIds = new LinkedHashSet<>();
        Set<Long> targetStudentIds = new LinkedHashSet<>();

        String targetType = request.getTargetPersonnelType(); // "EMPLOYEE", "TEACHER", "STUDENT", "ALL"

        if (request.getEmployeeIds() != null && !request.getEmployeeIds().isEmpty()) {
            targetEmployeeIds.addAll(request.getEmployeeIds());
        }
        if (request.getStudentIds() != null && !request.getStudentIds().isEmpty()) {
            targetStudentIds.addAll(request.getStudentIds());
        }

        if (targetType == null || "EMPLOYEE".equalsIgnoreCase(targetType) || "TEACHER".equalsIgnoreCase(targetType) || "ALL".equalsIgnoreCase(targetType)) {
            if (request.getDepartmentId() != null) {
                employeeRepository.findByDepartmentIdAndDeletedAtIsNull(request.getDepartmentId())
                        .forEach(e -> {
                            if (matchesPersonnelType(e, targetType)) targetEmployeeIds.add(e.getId());
                        });
            }
            if (request.getBranchId() != null) {
                employeeRepository.findByBranchIdAndDeletedAtIsNull(request.getBranchId())
                        .forEach(e -> {
                            if (matchesPersonnelType(e, targetType)) targetEmployeeIds.add(e.getId());
                        });
            }
            if ("EMPLOYEE".equalsIgnoreCase(targetType) && targetEmployeeIds.isEmpty() && request.getDepartmentId() == null && request.getBranchId() == null) {
                List<Employee> list = isAll ? employeeRepository.findByDeletedAtIsNull() : employeeRepository.findByCompanyCodeAndDeletedAtIsNull(activeTenant);
                list.stream().filter(e -> !Boolean.TRUE.equals(e.getIsTeacher()) && !"TEACHER".equalsIgnoreCase(e.getStaffType()))
                        .filter(e -> "ACTIVE".equalsIgnoreCase(e.getEmploymentStatus()))
                        .forEach(e -> targetEmployeeIds.add(e.getId()));
            }
            if ("TEACHER".equalsIgnoreCase(targetType) && targetEmployeeIds.isEmpty() && request.getDepartmentId() == null && request.getBranchId() == null) {
                List<Employee> list = isAll ? employeeRepository.findByDeletedAtIsNull() : employeeRepository.findByCompanyCodeAndDeletedAtIsNull(activeTenant);
                list.stream().filter(e -> Boolean.TRUE.equals(e.getIsTeacher()) || "TEACHER".equalsIgnoreCase(e.getStaffType()))
                        .filter(e -> "ACTIVE".equalsIgnoreCase(e.getEmploymentStatus()))
                        .forEach(e -> targetEmployeeIds.add(e.getId()));
            }
        }

        if ((targetType == null || "STUDENT".equalsIgnoreCase(targetType) || "ALL".equalsIgnoreCase(targetType)) && targetStudentIds.isEmpty()) {
            boolean hasStudentFilter = (request.getClassName() != null && !request.getClassName().isBlank())
                    || (request.getGrade() != null && !request.getGrade().isBlank())
                    || "STUDENT".equalsIgnoreCase(targetType)
                    || (request.getBranchId() != null && targetType != null);

            if (hasStudentFilter) {
                List<Student> students = isAll ? studentRepository.findByDeletedAtIsNull() : studentRepository.findByCompanyCodeAndDeletedAtIsNull(activeTenant);
                students.stream()
                        .filter(s -> "ACTIVE".equalsIgnoreCase(s.getStatus()) || s.getStatus() == null)
                        .filter(s -> request.getBranchId() == null || (s.getBranch() != null && s.getBranch().getId().equals(request.getBranchId())))
                        .filter(s -> request.getClassName() == null || request.getClassName().isBlank() || request.getClassName().equalsIgnoreCase(s.getClassName()))
                        .filter(s -> request.getGrade() == null || request.getGrade().isBlank() || request.getGrade().equalsIgnoreCase(s.getGrade()))
                        .forEach(s -> targetStudentIds.add(s.getId()));
            }
        }

        if (targetEmployeeIds.isEmpty() && targetStudentIds.isEmpty()) {
            throw new IllegalArgumentException("No employees, teachers, or students selected or found matching the criteria");
        }

        List<EmployeeSchedule> created = new ArrayList<>();
        for (Long empId : targetEmployeeIds) {
            Employee emp = employeeRepository.findById(empId).orElse(null);
            if (emp == null || emp.getDeletedAt() != null) continue;
            if (!isAll && !activeTenant.equalsIgnoreCase(emp.getCompanyCode())) continue;

            EmployeeSchedule schedule = EmployeeSchedule.builder()
                    .employee(emp)
                    .shift(shift)
                    .effectiveFrom(request.getEffectiveFrom())
                    .effectiveTo(request.getEffectiveTo())
                    .monday(request.getMonday() != null ? request.getMonday() : true)
                    .tuesday(request.getTuesday() != null ? request.getTuesday() : true)
                    .wednesday(request.getWednesday() != null ? request.getWednesday() : true)
                    .thursday(request.getThursday() != null ? request.getThursday() : true)
                    .friday(request.getFriday() != null ? request.getFriday() : true)
                    .saturday(request.getSaturday() != null ? request.getSaturday() : false)
                    .sunday(request.getSunday() != null ? request.getSunday() : false)
                    .build();
            created.add(schedule);
        }

        for (Long stuId : targetStudentIds) {
            Student stu = studentRepository.findById(stuId).orElse(null);
            if (stu == null || stu.getDeletedAt() != null) continue;
            if (!isAll && !activeTenant.equalsIgnoreCase(stu.getCompanyCode())) continue;

            EmployeeSchedule schedule = EmployeeSchedule.builder()
                    .student(stu)
                    .shift(shift)
                    .effectiveFrom(request.getEffectiveFrom())
                    .effectiveTo(request.getEffectiveTo())
                    .monday(request.getMonday() != null ? request.getMonday() : true)
                    .tuesday(request.getTuesday() != null ? request.getTuesday() : true)
                    .wednesday(request.getWednesday() != null ? request.getWednesday() : true)
                    .thursday(request.getThursday() != null ? request.getThursday() : true)
                    .friday(request.getFriday() != null ? request.getFriday() : true)
                    .saturday(request.getSaturday() != null ? request.getSaturday() : false)
                    .sunday(request.getSunday() != null ? request.getSunday() : false)
                    .build();
            created.add(schedule);
        }

        return scheduleRepository.saveAll(created).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private boolean matchesPersonnelType(Employee e, String targetType) {
        if (targetType == null || "ALL".equalsIgnoreCase(targetType)) return true;
        boolean isTeacher = Boolean.TRUE.equals(e.getIsTeacher()) || "TEACHER".equalsIgnoreCase(e.getStaffType());
        if ("TEACHER".equalsIgnoreCase(targetType)) return isTeacher;
        if ("EMPLOYEE".equalsIgnoreCase(targetType)) return !isTeacher;
        return true;
    }

    @Transactional
    public void deleteSchedule(Long id) {
        EmployeeSchedule s = scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule", "id", id));
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        String itemCompany = s.getEmployee() != null ? s.getEmployee().getCompanyCode()
                : (s.getStudent() != null ? s.getStudent().getCompanyCode() : null);
        if (!"all".equalsIgnoreCase(activeTenant) && itemCompany != null && !activeTenant.equalsIgnoreCase(itemCompany)) {
            throw new ResourceNotFoundException("Schedule", "id", id);
        }
        scheduleRepository.delete(s);
    }

    @Transactional
    public void deleteScheduleByEmployee(Long employeeId) {
        scheduleRepository.deleteByEmployeeId(employeeId);
    }

    @Transactional
    public void deleteScheduleByStudent(Long studentId) {
        scheduleRepository.deleteByStudentId(studentId);
    }

    public ScheduleDto toDto(EmployeeSchedule s) {
        ScheduleDto.ScheduleDtoBuilder b = ScheduleDto.builder()
                .id(s.getId())
                .shiftId(s.getShift() != null ? s.getShift().getId() : null)
                .shiftName(s.getShift() != null ? s.getShift().getName() : null)
                .effectiveFrom(s.getEffectiveFrom())
                .effectiveTo(s.getEffectiveTo())
                .monday(s.isMonday())
                .tuesday(s.isTuesday())
                .wednesday(s.isWednesday())
                .thursday(s.isThursday())
                .friday(s.isFriday())
                .saturday(s.isSaturday())
                .sunday(s.isSunday());

        if (s.getEmployee() != null) {
            boolean isTeacher = "TEACHER".equalsIgnoreCase(s.getEmployee().getStaffType()) ||
                    Boolean.TRUE.equals(s.getEmployee().getIsTeacher());
            b.personnelType(isTeacher ? "TEACHER" : "EMPLOYEE")
                    .employeeId(s.getEmployee().getId())
                    .employeeCode(s.getEmployee().getEmployeeCode())
                    .employeeName(s.getEmployee().getEnglishName())
                    .departmentName(s.getEmployee().getDepartment() != null ? s.getEmployee().getDepartment().getName() : null)
                    .branchName(s.getEmployee().getBranch() != null ? s.getEmployee().getBranch().getName() : null);
        } else if (s.getStudent() != null) {
            b.personnelType("STUDENT")
                    .studentId(s.getStudent().getId())
                    .studentCode(s.getStudent().getStudentCode())
                    .studentName(s.getStudent().getEnglishName())
                    .className(s.getStudent().getClassName())
                    .grade(s.getStudent().getGrade())
                    .branchName(s.getStudent().getBranch() != null ? s.getStudent().getBranch().getName() : null);
        }
        return b.build();
    }
}
