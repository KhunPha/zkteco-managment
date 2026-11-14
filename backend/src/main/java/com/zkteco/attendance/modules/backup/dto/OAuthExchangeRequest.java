package com.zkteco.attendance.modules.backup.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OAuthExchangeRequest {
    @NotBlank
    private String clientId;

    @NotBlank
    private String clientSecret;

    @NotBlank
    private String code;

    @NotBlank
    private String redirectUri;

    private String folderId;
}

