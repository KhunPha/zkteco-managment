package com.zkteco.attendance.modules.system;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "system_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "setting_key", nullable = false, unique = true, length = 100)
    private String settingKey;

    @Column(name = "setting_value", nullable = false, columnDefinition = "TEXT")
    private String settingValue;

    @Builder.Default
    @Column(nullable = false, length = 50)
    private String category = "GENERAL";

    @Column(length = 255)
    private String description;

    @Builder.Default
    @Column(name = "is_encrypted", nullable = false)
    private boolean encrypted = false;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}

