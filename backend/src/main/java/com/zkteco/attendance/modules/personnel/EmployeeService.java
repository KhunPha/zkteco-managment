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

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;
    private final BranchRepository branchRepository;

    @Transactional(readOnly = true)
    public PageResponse<EmployeeDto> getEmployees(String search, Long departmentId, Long branchId, String status, Pageable pageable) {
        Specification<Employee> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (search != null && !search.trim().isEmpty()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("employeeCode")), pattern),
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

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Employee> page = employeeRepository.findAll(spec, pageable);
        List<EmployeeDto> dtos = page.getContent().stream().map(this::toDto).collect(Collectors.toList());
        return PageResponse.of(page, dtos);
    }

    @Transactional(readOnly = true)
    public EmployeeDto getEmployeeById(Long id) {
        Employee emp = employeeRepository.findById(id)
                .filter(e -> e.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", id));
        return toDto(emp);
    }

    @Transactional
    public EmployeeDto createEmployee(CreateEmployeeRequest request) {
        if (employeeRepository.existsByEmployeeCodeAndDeletedAtIsNull(request.getEmployeeCode())) {
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Employee code already exists: " + request.getEmployeeCode());
        }

        Employee emp = Employee.builder()
                .employeeCode(request.getEmployeeCode().trim().toUpperCase())
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

        return toDto(employeeRepository.save(emp));
    }

    @Transactional
    public EmployeeDto updateEmployee(Long id, CreateEmployeeRequest request) {
        Employee emp = employeeRepository.findById(id)
                .filter(e -> e.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", id));

        if (request.getEmployeeCode() != null && !request.getEmployeeCode().trim().isEmpty()) {
            String newCode = request.getEmployeeCode().trim().toUpperCase();
            if (!newCode.equalsIgnoreCase(emp.getEmployeeCode())) {
                if (employeeRepository.existsByEmployeeCodeAndDeletedAtIsNull(newCode)) {
                    throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Employee code already exists: " + newCode);
                }
                emp.setEmployeeCode(newCode);
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

        return toDto(employeeRepository.save(emp));
    }

    @Transactional
    public void deleteEmployee(Long id) {
        Employee emp = employeeRepository.findById(id)
                .filter(e -> e.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", id));

        emp.setDeletedAt(Instant.now());
        emp.setEmploymentStatus("TERMINATED");
        employeeRepository.save(emp);
    }

    public EmployeeDto toDto(Employee emp) {
        if (emp == null) return null;
        return EmployeeDto.builder()
                .id(emp.getId())
                .userId(emp.getUser() != null ? emp.getUser().getId() : null)
                .employeeCode(emp.getEmployeeCode())
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
                .build();
    }
}

