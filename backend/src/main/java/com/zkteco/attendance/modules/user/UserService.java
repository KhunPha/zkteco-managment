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
    public PageResponse<UserDto> getUsers(String search, Pageable pageable) {
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
                return cb.and(predicate, searchPredicate);
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

        Set<Role> roles = new HashSet<>();
        if (request.getRoles() != null && !request.getRoles().isEmpty()) {
            for (String roleName : request.getRoles()) {
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

        if (request.getEmail() != null && !request.getEmail().equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmailAndDeletedAtIsNull(request.getEmail())) {
                throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Email already registered: " + request.getEmail());
            }
            user.setEmail(request.getEmail().trim().toLowerCase());
        }

        if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
        if (request.getLastName() != null) user.setLastName(request.getLastName());
        if (request.getPhoneNumber() != null) user.setPhoneNumber(request.getPhoneNumber());
        if (request.getActive() != null) user.setActive(request.getActive());
        if (request.getLocked() != null) user.setLocked(request.getLocked());

        if (request.getRoles() != null) {
            Set<Role> roles = new HashSet<>();
            for (String rName : request.getRoles()) {
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

        user.setDeletedAt(Instant.now());
        user.setActive(false);
        userRepository.save(user);
    }
}

