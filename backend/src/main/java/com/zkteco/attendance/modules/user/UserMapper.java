package com.zkteco.attendance.modules.user;

import com.zkteco.attendance.modules.user.dto.UserDto;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class UserMapper {

    public UserDto toDto(User user) {
        if (user == null) return null;

        Set<String> roleNames = user.getRoles() != null
                ? user.getRoles().stream().map(Role::getName).collect(Collectors.toSet())
                : Collections.emptySet();

        Set<String> permissionCodes = new HashSet<>();
        if (user.getRoles() != null) {
            user.getRoles().forEach(r -> {
                if (r.getPermissions() != null) {
                    r.getPermissions().forEach(p -> permissionCodes.add(p.getCode()));
                }
            });
        }

        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .fullName(user.getFullName())
                .phoneNumber(user.getPhoneNumber())
                .active(user.isActive())
                .locked(user.isLocked())
                .lastLoginAt(user.getLastLoginAt())
                .roles(roleNames)
                .permissions(permissionCodes)
                .build();
    }
}

