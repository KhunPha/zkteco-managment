package com.zkteco.attendance.config;

import com.zkteco.attendance.modules.user.Role;
import com.zkteco.attendance.modules.user.RoleRepository;
import com.zkteco.attendance.modules.user.User;
import com.zkteco.attendance.modules.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashSet;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        // Ensure SUPER_ADMIN role exists
        Role superAdminRole = roleRepository.findByName("SUPER_ADMIN").orElseGet(() -> {
            Role role = Role.builder()
                    .name("SUPER_ADMIN")
                    .description("Super Administrator with unrestricted access")
                    .isSystem(true)
                    .build();
            return roleRepository.save(role);
        });

        // Ensure other basic roles exist if empty
        String[] defaultRoles = {"ADMIN", "HR_MANAGER", "HR_STAFF", "DEPARTMENT_MANAGER", "SUPERVISOR", "TEACHER", "EMPLOYEE", "STUDENT"};
        for (String roleName : defaultRoles) {
            if (!roleRepository.existsByName(roleName)) {
                roleRepository.save(Role.builder()
                        .name(roleName)
                        .description(roleName + " Role")
                        .isSystem(true)
                        .build());
            }
        }

        // Ensure admin user exists
        if (!userRepository.existsByUsernameAndDeletedAtIsNull("admin")) {
            User admin = User.builder()
                    .username("admin")
                    .email("admin@enterprise.edu.kh")
                    .passwordHash(passwordEncoder.encode("Admin@123456"))
                    .firstName("Super")
                    .lastName("Administrator")
                    .phoneNumber("+855 23 888 999")
                    .active(true)
                    .locked(false)
                    .roles(new HashSet<>(Collections.singletonList(superAdminRole)))
                    .build();
            userRepository.save(admin);
            log.info("Initialized default administrator user: 'admin' (password: Admin@123456)");
        }
    }
}

