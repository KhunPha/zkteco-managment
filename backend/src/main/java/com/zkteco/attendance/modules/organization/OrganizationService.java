package com.zkteco.attendance.modules.organization;

import com.zkteco.attendance.common.AppException;
import com.zkteco.attendance.common.ErrorCode;
import com.zkteco.attendance.common.ResourceNotFoundException;
import com.zkteco.attendance.modules.organization.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrganizationService {

    private final BranchRepository branchRepository;
    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;

    // Branches
    @Transactional(readOnly = true)
    public List<BranchDto> getAllBranches() {
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        List<Branch> list = "all".equalsIgnoreCase(activeTenant)
                ? branchRepository.findAll()
                : branchRepository.findByCompanyCode(activeTenant.trim().toLowerCase());
        return list.stream().map(this::toBranchDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BranchDto getBranchById(Long id) {
        Branch branch = branchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Branch", "id", id));
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if (!"all".equalsIgnoreCase(activeTenant) && !activeTenant.equalsIgnoreCase(branch.getCompanyCode())) {
            throw new ResourceNotFoundException("Branch", "id", id);
        }
        return toBranchDto(branch);
    }

    @Transactional
    public BranchDto createBranch(CreateBranchRequest request) {
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if ("all".equalsIgnoreCase(activeTenant)) activeTenant = "default";

        if (branchRepository.existsByCompanyCodeAndCode(activeTenant, request.getCode().trim().toUpperCase())) {
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Branch code already exists: " + request.getCode());
        }
        Branch branch = Branch.builder()
                .code(request.getCode().trim().toUpperCase())
                .name(request.getName().trim())
                .address(request.getAddress())
                .phone(request.getPhone())
                .email(request.getEmail())
                .active(request.getActive() != null ? request.getActive() : true)
                .companyCode(activeTenant)
                .build();
        return toBranchDto(branchRepository.save(branch));
    }

    @Transactional
    public BranchDto updateBranch(Long id, CreateBranchRequest request) {
        Branch branch = branchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Branch", "id", id));
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if (!"all".equalsIgnoreCase(activeTenant) && !activeTenant.equalsIgnoreCase(branch.getCompanyCode())) {
            throw new ResourceNotFoundException("Branch", "id", id);
        }

        branch.setName(request.getName().trim());
        branch.setAddress(request.getAddress());
        branch.setPhone(request.getPhone());
        branch.setEmail(request.getEmail());
        if (request.getActive() != null) branch.setActive(request.getActive());

        return toBranchDto(branchRepository.save(branch));
    }

    @Transactional
    public void deleteBranch(Long id) {
        Branch branch = branchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Branch", "id", id));
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if (!"all".equalsIgnoreCase(activeTenant) && !activeTenant.equalsIgnoreCase(branch.getCompanyCode())) {
            throw new ResourceNotFoundException("Branch", "id", id);
        }
        branchRepository.delete(branch);
    }

    // Departments
    @Transactional(readOnly = true)
    public List<DepartmentDto> getAllDepartments() {
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        List<Department> list = "all".equalsIgnoreCase(activeTenant)
                ? departmentRepository.findAll()
                : departmentRepository.findByCompanyCode(activeTenant.trim().toLowerCase());
        return list.stream().map(this::toDepartmentDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DepartmentDto getDepartmentById(Long id) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", "id", id));
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if (!"all".equalsIgnoreCase(activeTenant) && !activeTenant.equalsIgnoreCase(dept.getCompanyCode())) {
            throw new ResourceNotFoundException("Department", "id", id);
        }
        return toDepartmentDto(dept);
    }

    @Transactional
    public DepartmentDto createDepartment(CreateDepartmentRequest request) {
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if ("all".equalsIgnoreCase(activeTenant)) activeTenant = "default";

        if (departmentRepository.existsByCompanyCodeAndCode(activeTenant, request.getCode().trim().toUpperCase())) {
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Department code already exists: " + request.getCode());
        }
        Branch branch = request.getBranchId() != null
                ? branchRepository.findById(request.getBranchId()).orElse(null)
                : null;
        Department parent = request.getParentId() != null
                ? departmentRepository.findById(request.getParentId()).orElse(null)
                : null;

        Department dept = Department.builder()
                .code(request.getCode().trim().toUpperCase())
                .name(request.getName().trim())
                .branch(branch)
                .parent(parent)
                .active(request.getActive() != null ? request.getActive() : true)
                .companyCode(activeTenant)
                .build();
        return toDepartmentDto(departmentRepository.save(dept));
    }

    @Transactional
    public DepartmentDto updateDepartment(Long id, CreateDepartmentRequest request) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", "id", id));
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if (!"all".equalsIgnoreCase(activeTenant) && !activeTenant.equalsIgnoreCase(dept.getCompanyCode())) {
            throw new ResourceNotFoundException("Department", "id", id);
        }

        dept.setName(request.getName().trim());
        if (request.getBranchId() != null) {
            dept.setBranch(branchRepository.findById(request.getBranchId()).orElse(null));
        }
        if (request.getParentId() != null) {
            dept.setParent(departmentRepository.findById(request.getParentId()).orElse(null));
        }
        if (request.getActive() != null) dept.setActive(request.getActive());

        return toDepartmentDto(departmentRepository.save(dept));
    }

    @Transactional
    public void deleteDepartment(Long id) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", "id", id));
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if (!"all".equalsIgnoreCase(activeTenant) && !activeTenant.equalsIgnoreCase(dept.getCompanyCode())) {
            throw new ResourceNotFoundException("Department", "id", id);
        }
        departmentRepository.delete(dept);
    }

    // Positions
    @Transactional(readOnly = true)
    public List<PositionDto> getAllPositions() {
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        List<Position> list = "all".equalsIgnoreCase(activeTenant)
                ? positionRepository.findAll()
                : positionRepository.findByCompanyCode(activeTenant.trim().toLowerCase());
        if (list.isEmpty() && !"default".equalsIgnoreCase(activeTenant)) {
            list = positionRepository.findByCompanyCode("default");
        }
        return list.stream().map(this::toPositionDto).collect(Collectors.toList());
    }

    @Transactional
    public PositionDto createPosition(CreatePositionRequest request) {
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if ("all".equalsIgnoreCase(activeTenant)) activeTenant = "default";

        if (positionRepository.existsByCompanyCodeAndCode(activeTenant, request.getCode().trim().toUpperCase())) {
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Position code already exists: " + request.getCode());
        }
        Position pos = Position.builder()
                .code(request.getCode().trim().toUpperCase())
                .title(request.getTitle().trim())
                .description(request.getDescription())
                .active(request.getActive() != null ? request.getActive() : true)
                .companyCode(activeTenant)
                .build();
        return toPositionDto(positionRepository.save(pos));
    }

    @Transactional
    public PositionDto updatePosition(Long id, CreatePositionRequest request) {
        Position pos = positionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Position", "id", id));
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if (!"all".equalsIgnoreCase(activeTenant) && !activeTenant.equalsIgnoreCase(pos.getCompanyCode())) {
            throw new ResourceNotFoundException("Position", "id", id);
        }
        pos.setTitle(request.getTitle().trim());
        pos.setDescription(request.getDescription());
        if (request.getActive() != null) pos.setActive(request.getActive());
        return toPositionDto(positionRepository.save(pos));
    }

    @Transactional
    public void deletePosition(Long id) {
        Position pos = positionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Position", "id", id));
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if (!"all".equalsIgnoreCase(activeTenant) && !activeTenant.equalsIgnoreCase(pos.getCompanyCode())) {
            throw new ResourceNotFoundException("Position", "id", id);
        }
        positionRepository.delete(pos);
    }

    // Mappers
    private BranchDto toBranchDto(Branch b) {
        return BranchDto.builder()
                .id(b.getId())
                .code(b.getCode())
                .name(b.getName())
                .address(b.getAddress())
                .phone(b.getPhone())
                .email(b.getEmail())
                .active(b.isActive())
                .build();
    }

    private DepartmentDto toDepartmentDto(Department d) {
        return DepartmentDto.builder()
                .id(d.getId())
                .branchId(d.getBranch() != null ? d.getBranch().getId() : null)
                .branchName(d.getBranch() != null ? d.getBranch().getName() : null)
                .code(d.getCode())
                .name(d.getName())
                .parentId(d.getParent() != null ? d.getParent().getId() : null)
                .parentName(d.getParent() != null ? d.getParent().getName() : null)
                .active(d.isActive())
                .build();
    }

    private PositionDto toPositionDto(Position p) {
        return PositionDto.builder()
                .id(p.getId())
                .code(p.getCode())
                .title(p.getTitle())
                .description(p.getDescription())
                .active(p.isActive())
                .build();
    }
}

