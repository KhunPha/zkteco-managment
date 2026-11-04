package com.zkteco.attendance.modules.zkteco;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RawDeviceUser {
    private String pin;
    private String name;
    private String privilege; // NORMAL_USER, ADMIN, ENROLLER, SUPER_ADMIN
    private String password;
    private String cardNumber;
    private boolean enabled;
    private int fingerprintCount;
    private boolean faceEnrolled;
}

