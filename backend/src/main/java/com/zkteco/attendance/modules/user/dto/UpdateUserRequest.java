package com.zkteco.attendance.modules.user.dto;

import jakarta.validation.constraints.Email;
import lombok.Data;

import java.util.Set;

@Data
public class UpdateUserRequest {
    @Email(message = "Invalid email format")
    private String email;

    private String firstName;
    private String lastName;
    private String phoneNumber;
    private Boolean active;
    private Boolean locked;
    private String profileImageUrl;
    private Set<String> roles;
}

