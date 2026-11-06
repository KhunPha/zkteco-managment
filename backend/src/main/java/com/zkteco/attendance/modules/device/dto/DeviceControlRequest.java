package com.zkteco.attendance.modules.device.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceControlRequest {
    @NotBlank(message = "Control action is required")
    private String action; // SYNC_TIME, TEST_VOICE, RESTART, POWER_OFF, DISABLE, ENABLE, CLEAR_LOGS

    @Builder.Default
    private Integer voiceIndex = 0; // Default 0: "Thank You"
}

