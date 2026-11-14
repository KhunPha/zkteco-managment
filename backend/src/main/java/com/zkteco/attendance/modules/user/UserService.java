package com.zkteco.attendance.modules.user;

import com.zkteco.attendance.common.AppException;
import com.zkteco.attendance.common.ErrorCode;
import com.zkteco.attendance.common.PageResponse;
import com.zkteco.attendance.common.ResourceNotFoundException;
import com.zkteco.attendance.modules.user.dto.CreateUserRequest;
import com.zkteco.attendance.modules.user.dto.UpdateUserRequest;
import com.zkteco.attendance.modules.user.dto.UserDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    @Transactional(readOnly = true)
    public PageResponse<UserDto> getUsers(String search, String companyCode, Pageable pageable) {
        org.springframework.security.core.Authentication auth = 
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean isSuperAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()));

        final String effective = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        final String activeTenant;
        if (isSuperAdmin) {
            activeTenant = (companyCode != null && !companyCode.isBlank()) ? companyCode : effective;
        } else {
            activeTenant = effective;
        }

        Specification<User> spec = (root, query, cb) -> {
            var predicate = cb.isNull(root.get("deletedAt"));
            if (search != null && !search.trim().isEmpty()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                var searchPredicate = cb.or(
                        cb.like(cb.lower(root.get("username")), pattern),
                        cb.like(cb.lower(root.get("email")), pattern),
                        cb.like(cb.lower(root.get("firstName")), pattern),
                        cb.like(cb.lower(root.get("lastName")), pattern)
                );
                predicate = cb.and(predicate, searchPredicate);
            }

            if (activeTenant != null && !activeTenant.isBlank() && !"all".equalsIgnoreCase(activeTenant)) {
                predicate = cb.and(predicate, cb.equal(root.get("companyCode"), activeTenant.trim().toLowerCase()));
            }

            return predicate;
        };

        Page<User> page = userRepository.findAll(spec, pageable);
        List<UserDto> dtos = page.getContent().stream().map(userMapper::toDto).collect(Collectors.toList());
        return PageResponse.of(page, dtos);
    }

    @Transactional(readOnly = true)
    public UserDto getUserById(Long id) {
        User user = userRepository.findById(id)
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        org.springframework.security.core.Authentication auth = 
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean isSuperAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if (!isSuperAdmin && !activeTenant.equalsIgnoreCase(user.getCompanyCode())) {
            throw new ResourceNotFoundException("User", "id", id);
        }

        return userMapper.toDto(user);
    }

    @Transactional
    public UserDto createUser(CreateUserRequest request) {
        if (userRepository.existsByUsernameAndDeletedAtIsNull(request.getUsername())) {
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Username already exists: " + request.getUsername());
        }
        if (userRepository.existsByEmailAndDeletedAtIsNull(request.getEmail())) {
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Email already exists: " + request.getEmail());
        }

        org.springframework.security.core.Authentication auth = 
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean isSuperAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()));

        String companyCode;
        if (isSuperAdmin && request.getCompanyCode() != null && !request.getCompanyCode().isBlank()) {
            companyCode = request.getCompanyCode().trim().toLowerCase();
        } else {
            String tenantCode = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
            companyCode = (tenantCode != null && !tenantCode.isBlank() && !"all".equalsIgnoreCase(tenantCode)) ? tenantCode : "default";
        }

        Set<Role> roles = new HashSet<>();
        if (request.getRoles() != null && !request.getRoles().isEmpty()) {
            for (String roleName : request.getRoles()) {
                if ("SUPER_ADMIN".equalsIgnoreCase(roleName)) {
                    if (!isSuperAdmin) {
                        throw new AppException(ErrorCode.ACCESS_DENIED, "Only Platform System Owner (SUPER_ADMIN) can assign the SUPER_ADMIN role.");
                    }
                    if (!"default".equalsIgnoreCase(companyCode)) {
                        throw new AppException(ErrorCode.ACCESS_DENIED, "A client company cannot create or have a SUPER_ADMIN account. SUPER_ADMIN is reserved exclusively for the Platform System Owner.");
                    }
                }
                roleRepository.findByName(roleName).ifPresent(roles::add);
            }
        }
        if (roles.isEmpty()) {
            roleRepository.findByName("EMPLOYEE").ifPresent(roles::add);
        }

        User user = User.builder()
                .username(request.getUsername().trim())
                .email(request.getEmail().trim().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .phoneNumber(request.getPhoneNumber())
                .profileImageUrl(request.getProfileImageUrl())
                .companyCode(companyCode.trim().toLowerCase())
                .active(true)
                .locked(false)
                .roles(roles)
                .build();

        User saved = userRepository.save(user);
        return userMapper.toDto(saved);
    }

    @Transactional
    public UserDto updateUser(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        org.springframework.security.core.Authentication auth = 
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean isSuperAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()));

        boolean targetIsSuperAdmin = user.getRoles() != null && user.getRoles().stream()
                .anyMatch(r -> "SUPER_ADMIN".equalsIgnoreCase(r.getName()));

        if (targetIsSuperAdmin && !isSuperAdmin) {
            throw new AppException(ErrorCode.ACCESS_DENIED, "Company administrators cannot modify a SUPER_ADMIN account.");
        }

        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if (!isSuperAdmin && !activeTenant.equalsIgnoreCase(user.getCompanyCode())) {
            throw new ResourceNotFoundException("User", "id", id);
        }

        if (request.getEmail() != null && !request.getEmail().equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmailAndDeletedAtIsNull(request.getEmail())) {
                throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Email already registered: " + request.getEmail());
            }
            user.setEmail(request.getEmail().trim().toLowerCase());
        }

        if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
        if (request.getLastName() != null) user.setLastName(request.getLastName());
        if (request.getPhoneNumber() != null) user.setPhoneNumber(request.getPhoneNumber());
        if (request.getProfileImageUrl() != null) user.setProfileImageUrl(request.getProfileImageUrl());
        
        String effectiveCompany = user.getCompanyCode();
        if (request.getCompanyCode() != null && !request.getCompanyCode().isBlank()) {
            if (!isSuperAdmin && !user.getCompanyCode().equalsIgnoreCase(request.getCompanyCode().trim())) {
                throw new AppException(ErrorCode.ACCESS_DENIED, "Company administrators cannot change company tenant code.");
            }
            if (isSuperAdmin) {
                effectiveCompany = request.getCompanyCode().trim().toLowerCase();
                user.setCompanyCode(effectiveCompany);
            }
        }
        if (request.getActive() != null) user.setActive(request.getActive());
        if (request.getLocked() != null) user.setLocked(request.getLocked());

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword().trim()));
            user.setFailedLoginAttempts(0);
            user.setLocked(false);
        }

        if (request.getRoles() != null) {
            Set<Role> roles = new HashSet<>();
            for (String rName : request.getRoles()) {
                if ("SUPER_ADMIN".equalsIgnoreCase(rName)) {
                    if (!isSuperAdmin) {
                        throw new AppException(ErrorCode.ACCESS_DENIED, "Only Platform System Owner (SUPER_ADMIN) can assign the SUPER_ADMIN role.");
                    }
                    if (!"default".equalsIgnoreCase(effectiveCompany)) {
                        throw new AppException(ErrorCode.ACCESS_DENIED, "A client company cannot have a SUPER_ADMIN account. SUPER_ADMIN is reserved exclusively for the Platform System Owner.");
                    }
                }
                roleRepository.findByName(rName).ifPresent(roles::add);
            }
            user.setRoles(roles);
        }

        User updated = userRepository.save(user);
        return userMapper.toDto(updated);
    }

    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        org.springframework.security.core.Authentication auth = 
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean isSuperAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()));

        boolean targetIsSuperAdmin = user.getRoles() != null && user.getRoles().stream()
                .anyMatch(r -> "SUPER_ADMIN".equalsIgnoreCase(r.getName()));

        if (targetIsSuperAdmin && !isSuperAdmin) {
            throw new AppException(ErrorCode.ACCESS_DENIED, "Company administrators cannot delete a SUPER_ADMIN account.");
        }

        String activeTenant = com.zkteco.attendance.modules.tenant.TenantContext.resolveEffectiveTenant();
        if (!isSuperAdmin && !activeTenant.equalsIgnoreCase(user.getCompanyCode())) {
            throw new ResourceNotFoundException("User", "id", id);
        }

        user.setDeletedAt(Instant.now());
        user.setActive(false);
        userRepository.save(user);
    }
}

