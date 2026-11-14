package com.zkteco.attendance.modules.tenant;

import com.zkteco.attendance.common.AppException;
import com.zkteco.attendance.common.ErrorCode;
import com.zkteco.attendance.common.ResourceNotFoundException;
import com.zkteco.attendance.modules.tenant.dto.CompanyDto;
import com.zkteco.attendance.modules.tenant.dto.CreateCompanyAdminRequest;
import com.zkteco.attendance.modules.tenant.dto.CreateCompanyRequest;
import com.zkteco.attendance.modules.tenant.dto.UpdateCompanyRequest;
import com.zkteco.attendance.modules.organization.*;
import com.zkteco.attendance.modules.shift.*;
import com.zkteco.attendance.modules.user.RoleRepository;
import com.zkteco.attendance.modules.user.User;
import com.zkteco.attendance.modules.user.UserMapper;
import com.zkteco.attendance.modules.user.UserRepository;
import com.zkteco.attendance.modules.user.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final JdbcTemplate jdbcTemplate;
    private final UserService userService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;
    private final BranchRepository branchRepository;
    private final DepartmentRepository departmentRepository;
    private final ShiftRepository shiftRepository;
    private final PositionRepository positionRepository;

    @Transactional(readOnly = true)
    public List<CompanyDto> getAllCompanies() {
        return companyRepository.findAll().stream()
                .map(this::mapToDtoWithStats)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CompanyDto getCompanyById(Long id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found with id: " + id));
        return mapToDtoWithStats(company);
    }

    @Transactional(readOnly = true)
    public CompanyDto getCompanyByCode(String code) {
        Company company = companyRepository.findByCompanyCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found with code: " + code));
        return mapToDtoWithStats(company);
    }

    @Transactional(readOnly = true)
    public CompanyDto getCurrentCompany() {
        String code = TenantContext.getTenantId();
        Company company = companyRepository.findByCompanyCode(code)
                .orElseGet(() -> companyRepository.findByCompanyCode("default")
                        .orElseThrow(() -> new ResourceNotFoundException("No active company found for tenant: " + code)));
        return mapToDtoWithStats(company);
    }

    @Transactional
    public CompanyDto updateCurrentCompany(UpdateCompanyRequest request) {
        String code = TenantContext.getTenantId();
        Company company = companyRepository.findByCompanyCode(code)
                .orElseGet(() -> companyRepository.findByCompanyCode("default")
                        .orElseThrow(() -> new ResourceNotFoundException("No active company found for tenant: " + code)));

        company.setName(request.getName().trim());
        if (request.getKhmerName() != null) company.setKhmerName(request.getKhmerName().trim());
        if (request.getLogoUrl() != null) company.setLogoUrl(request.getLogoUrl());
        if (request.getContactName() != null) company.setContactName(request.getContactName());
        if (request.getContactPhone() != null) company.setContactPhone(request.getContactPhone());
        if (request.getContactEmail() != null) company.setContactEmail(request.getContactEmail());
        if (request.getAddress() != null) company.setAddress(request.getAddress());

        Company saved = companyRepository.save(company);
        log.info("Tenant self-updated company profile: code={}, name={}", saved.getCompanyCode(), saved.getName());
        return mapToDtoWithStats(saved);
    }

    @Transactional
    public CompanyDto createCompany(CreateCompanyRequest request) {
        String cleanCode = request.getCompanyCode().trim().toLowerCase();
        if (companyRepository.existsByCompanyCode(cleanCode)) {
            throw new IllegalArgumentException("Company code '" + cleanCode + "' is already registered");
        }

        Company company = Company.builder()
                .companyCode(cleanCode)
                .name(request.getName().trim())
                .khmerName(request.getKhmerName() != null ? request.getKhmerName().trim() : null)
                .logoUrl(request.getLogoUrl())
                .plan(request.getPlan() != null ? request.getPlan().toUpperCase() : "PRO")
                .status(request.getStatus() != null ? request.getStatus().toUpperCase() : "ACTIVE")
                .maxUsers(request.getMaxUsers() > 0 ? request.getMaxUsers() : 500)
                .maxDevices(request.getMaxDevices() > 0 ? request.getMaxDevices() : 10)
                .contactName(request.getContactName())
                .contactPhone(request.getContactPhone())
                .contactEmail(request.getContactEmail())
                .address(request.getAddress())
                .licenseExpiresAt(request.getLicenseExpiresAt())
                .build();

        Company saved = companyRepository.save(company);
        log.info("Created new tenant company: code={}, name={}", saved.getCompanyCode(), saved.getName());

        // Auto-bootstrap starter organizational foundation (branch, department, shift, positions)
        bootstrapCompanyStarterData(saved.getCompanyCode(), saved.getName());

        CompanyDto dto = mapToDtoWithStats(saved);

        // Provision Initial Company Administrator if credentials provided
        String adminUser = request.getAdminUsername();
        if (adminUser != null && !adminUser.isBlank()) {
            String cleanUser = adminUser.trim().toLowerCase();
            String adminEmail = request.getAdminEmail() != null && !request.getAdminEmail().isBlank()
                    ? request.getAdminEmail().trim()
                    : cleanUser + "@" + cleanCode + ".com";
            String adminPassword = request.getAdminPassword() != null && !request.getAdminPassword().isBlank()
                    ? request.getAdminPassword()
                    : "Password@123";
            String adminName = request.getAdminFullName() != null && !request.getAdminFullName().isBlank()
                    ? request.getAdminFullName().trim()
                    : saved.getName() + " Administrator";

            com.zkteco.attendance.modules.user.dto.CreateUserRequest userReq = new com.zkteco.attendance.modules.user.dto.CreateUserRequest();
            userReq.setUsername(cleanUser);
            userReq.setEmail(adminEmail);
            userReq.setPassword(adminPassword);
            userReq.setFirstName(adminName);
            userReq.setCompanyCode(cleanCode);
            userReq.setRoles(java.util.Set.of("ADMIN"));

            userService.createUser(userReq);
            log.info("Provisioned initial administrator '{}' for company '{}'", cleanUser, cleanCode);

            dto.setAdminUsername(cleanUser);
            dto.setAdminEmail(adminEmail);
            dto.setInitialAdminPassword(adminPassword);
        }

        return dto;
    }

    @Transactional
    public com.zkteco.attendance.modules.user.dto.UserDto createOrResetCompanyAdmin(
            String companyCode, CreateCompanyAdminRequest request) {
        String cleanCode = companyCode.trim().toLowerCase();
        Company company = companyRepository.findByCompanyCode(cleanCode)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found with code: " + cleanCode));

        String username = request.getUsername().trim().toLowerCase();
        String email = request.getEmail().trim().toLowerCase();
        String password = request.getPassword() != null ? request.getPassword().trim() : "";
        if (password.isBlank()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Password cannot be empty");
        }

        String fullName = request.getFullName() != null && !request.getFullName().isBlank()
                ? request.getFullName().trim()
                : company.getName() + " Administrator";

        // Check if an existing user matches:
        // 1. By exact username
        User existingUser = userRepository.findByUsernameAndDeletedAtIsNull(username).orElse(null);

        // 2. If not found by username, check by email
        if (existingUser == null) {
            existingUser = userRepository.findByEmailAndDeletedAtIsNull(email).orElse(null);
        }

        // 3. If still not found, check if this company already has an existing Admin user
        if (existingUser == null) {
            List<User> companyUsers = userRepository.findByCompanyCodeAndDeletedAtIsNull(cleanCode);
            for (User u : companyUsers) {
                boolean isAdmin = u.getRoles() != null && u.getRoles().stream()
                        .anyMatch(r -> "ADMIN".equalsIgnoreCase(r.getName()));
                if (isAdmin) {
                    existingUser = u;
                    break;
                }
            }
        }

        if (existingUser != null) {
            // Verify tenant boundary
            if (!cleanCode.equalsIgnoreCase(existingUser.getCompanyCode()) && !"default".equalsIgnoreCase(existingUser.getCompanyCode())) {
                throw new AppException(ErrorCode.DUPLICATE_RESOURCE, 
                        "An account with email '" + email + "' already belongs to another organization (" + existingUser.getCompanyCode() + ").");
            }

            // If username is changing, ensure new username is not taken by another user
            if (!username.equalsIgnoreCase(existingUser.getUsername())) {
                var conflict = userRepository.findByUsernameAndDeletedAtIsNull(username);
                if (conflict.isPresent() && !conflict.get().getId().equals(existingUser.getId())) {
                    throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Username already exists: " + username);
                }
                existingUser.setUsername(username);
            }

            // If email is changing, ensure new email is not taken by another user
            if (!email.equalsIgnoreCase(existingUser.getEmail())) {
                var conflict = userRepository.findByEmailAndDeletedAtIsNull(email);
                if (conflict.isPresent() && !conflict.get().getId().equals(existingUser.getId())) {
                    throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Email already exists: " + email);
                }
                existingUser.setEmail(email);
            }

            // Reset password and reactivate
            existingUser.setPasswordHash(passwordEncoder.encode(password));
            existingUser.setFirstName(fullName);
            existingUser.setCompanyCode(cleanCode);
            existingUser.setActive(true);
            existingUser.setLocked(false);
            existingUser.setFailedLoginAttempts(0);
            existingUser.setDeletedAt(null);

            // Ensure ADMIN role is present
            boolean hasAdmin = existingUser.getRoles() != null && existingUser.getRoles().stream()
                    .anyMatch(r -> "ADMIN".equalsIgnoreCase(r.getName()));
            if (!hasAdmin) {
                var adminRoleOpt = roleRepository.findByName("ADMIN");
                if (adminRoleOpt.isPresent()) {
                    if (existingUser.getRoles() == null) {
                        existingUser.setRoles(new java.util.HashSet<>());
                    }
                    existingUser.getRoles().add(adminRoleOpt.get());
                }
            }

            User saved = userRepository.save(existingUser);
            log.info("Successfully reset credentials for company admin '{}' of tenant '{}'", saved.getUsername(), cleanCode);
            return userMapper.toDto(saved);
        }

        // Brand new Admin User
        if (userRepository.existsByUsernameAndDeletedAtIsNull(username)) {
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Username already exists: " + username);
        }
        if (userRepository.existsByEmailAndDeletedAtIsNull(email)) {
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Email already exists: " + email);
        }

        com.zkteco.attendance.modules.user.dto.CreateUserRequest userReq = new com.zkteco.attendance.modules.user.dto.CreateUserRequest();
        userReq.setUsername(username);
        userReq.setEmail(email);
        userReq.setPassword(password);
        userReq.setFirstName(fullName);
        userReq.setCompanyCode(cleanCode);
        userReq.setRoles(java.util.Set.of("ADMIN"));

        com.zkteco.attendance.modules.user.dto.UserDto userDto = userService.createUser(userReq);
        log.info("Platform Super Admin created new company admin '{}' for tenant '{}'", username, cleanCode);
        return userDto;
    }

    @Transactional
    public CompanyDto updateCompany(Long id, UpdateCompanyRequest request) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found with id: " + id));

        company.setName(request.getName().trim());
        if (request.getKhmerName() != null) company.setKhmerName(request.getKhmerName().trim());
        if (request.getLogoUrl() != null) company.setLogoUrl(request.getLogoUrl());
        if (request.getPlan() != null) company.setPlan(request.getPlan().toUpperCase());
        if (request.getStatus() != null) company.setStatus(request.getStatus().toUpperCase());
        if (request.getMaxUsers() != null) company.setMaxUsers(request.getMaxUsers());
        if (request.getMaxDevices() != null) company.setMaxDevices(request.getMaxDevices());
        if (request.getContactName() != null) company.setContactName(request.getContactName());
        if (request.getContactPhone() != null) company.setContactPhone(request.getContactPhone());
        if (request.getContactEmail() != null) company.setContactEmail(request.getContactEmail());
        if (request.getAddress() != null) company.setAddress(request.getAddress());
        if (request.getLicenseExpiresAt() != null) company.setLicenseExpiresAt(request.getLicenseExpiresAt());

        Company saved = companyRepository.save(company);
        log.info("Updated company id={}, code={}", saved.getId(), saved.getCompanyCode());
        return mapToDtoWithStats(saved);
    }

    @Transactional
    public CompanyDto toggleStatus(Long id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found with id: " + id));

        if ("default".equalsIgnoreCase(company.getCompanyCode())) {
            throw new IllegalStateException("Default main company cannot be suspended");
        }

        String newStatus = "ACTIVE".equalsIgnoreCase(company.getStatus()) ? "SUSPENDED" : "ACTIVE";
        company.setStatus(newStatus);
        Company saved = companyRepository.save(company);
        log.info("Toggled company status id={}, code={}, newStatus={}", saved.getId(), saved.getCompanyCode(), newStatus);
        return mapToDtoWithStats(saved);
    }

    @Transactional
    public void deleteCompany(Long id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found with id: " + id));

        if ("default".equalsIgnoreCase(company.getCompanyCode())) {
            throw new IllegalStateException("Default main company cannot be deleted");
        }

        companyRepository.delete(company);
        log.info("Deleted company id={}, code={}", id, company.getCompanyCode());
    }

    private CompanyDto mapToDtoWithStats(Company c) {
        long empCount = 0;
        long devCount = 0;
        String adminUsername = null;
        String adminEmail = null;
        try {
            Long e = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM employees WHERE company_code = ?", Long.class, c.getCompanyCode());
            empCount = e != null ? e : 0;
            Long d = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM attendance_devices WHERE company_code = ?", Long.class, c.getCompanyCode());
            devCount = d != null ? d : 0;

            List<Map<String, Object>> adminRows = jdbcTemplate.queryForList(
                    "SELECT u.username, u.email FROM users u " +
                    "JOIN user_roles ur ON u.id = ur.user_id " +
                    "JOIN roles r ON ur.role_id = r.id " +
                    "WHERE u.company_code = ? AND u.deleted_at IS NULL AND r.name IN ('ADMIN', 'SUPER_ADMIN') " +
                    "ORDER BY u.id ASC LIMIT 1",
                    c.getCompanyCode()
            );
            if (!adminRows.isEmpty()) {
                adminUsername = (String) adminRows.get(0).get("username");
                adminEmail = (String) adminRows.get(0).get("email");
            }
        } catch (Exception ignored) {
            // Table column might be initializing
        }

        return CompanyDto.builder()
                .id(c.getId())
                .companyCode(c.getCompanyCode())
                .name(c.getName())
                .khmerName(c.getKhmerName())
                .logoUrl(c.getLogoUrl())
                .plan(c.getPlan())
                .status(c.getStatus())
                .maxUsers(c.getMaxUsers())
                .maxDevices(c.getMaxDevices())
                .contactName(c.getContactName())
                .contactPhone(c.getContactPhone())
                .contactEmail(c.getContactEmail())
                .address(c.getAddress())
                .licenseExpiresAt(c.getLicenseExpiresAt())
                .createdAt(c.getCreatedAt())
                .employeeCount(empCount)
                .deviceCount(devCount)
                .adminUsername(adminUsername)
                .adminEmail(adminEmail)
                .build();
    }

    private void bootstrapCompanyStarterData(String companyCode, String companyName) {
        try {
            // 1. Starter Branch
            Branch branch = Branch.builder()
                    .code("MAIN")
                    .name(companyName + " Head Office")
                    .active(true)
                    .companyCode(companyCode)
                    .build();
            Branch savedBranch = branchRepository.save(branch);

            // 2. Starter Department
            Department dept = Department.builder()
                    .code("GEN")
                    .name("General Administration")
                    .branch(savedBranch)
                    .active(true)
                    .companyCode(companyCode)
                    .build();
            departmentRepository.save(dept);

            // 3. Starter Shift
            Shift shift = Shift.builder()
                    .code("STANDARD")
                    .name("Standard Office (08:00 - 17:00)")
                    .startTime(java.time.LocalTime.of(8, 0))
                    .endTime(java.time.LocalTime.of(17, 0))
                    .breakStart(java.time.LocalTime.of(12, 0))
                    .breakEnd(java.time.LocalTime.of(13, 0))
                    .graceLateMinutes(15)
                    .graceEarlyLeaveMinutes(15)
                    .workHours(new java.math.BigDecimal("8.00"))
                    .overnight(false)
                    .flexible(false)
                    .requiresCheckout(true)
                    .active(true)
                    .companyCode(companyCode)
                    .build();
            shiftRepository.save(shift);

            // 4. Starter Positions
            List<Position> defaultPositions = List.of(
                    Position.builder().code("MGR").title("Manager").companyCode(companyCode).active(true).build(),
                    Position.builder().code("STF").title("Staff Member").companyCode(companyCode).active(true).build(),
                    Position.builder().code("TCH").title("Teacher / Instructor").companyCode(companyCode).active(true).build(),
                    Position.builder().code("TECH").title("Technical Specialist").companyCode(companyCode).active(true).build()
            );
            positionRepository.saveAll(defaultPositions);
            log.info("Bootstrapped default starter organizational records for company '{}'", companyCode);
        } catch (Exception ex) {
            log.warn("Could not bootstrap starter data for company {}: {}", companyCode, ex.getMessage());
        }
    }
}
