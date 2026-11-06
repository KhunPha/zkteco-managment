package com.zkteco.attendance.modules.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private Long id;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String fullName;
    private String phoneNumber;
    private boolean active;
    private boolean locked;
    private Instant lastLoginAt;
    private String profileImageUrl;
    private Set<String> roles;
    private Set<String> permissions;
}

