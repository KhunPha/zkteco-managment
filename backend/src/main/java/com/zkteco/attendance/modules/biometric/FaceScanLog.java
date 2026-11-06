package com.zkteco.attendance.modules.biometric;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "face_scan_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FaceScanLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_pin", length = 50)
    private String devicePin;

    @Column(name = "person_name", length = 150)
    private String personName;

    @Column(name = "personnel_type", length = 50)
    private String personnelType;

    @Column(name = "confidence_score")
    private Double confidenceScore;

    @Column(name = "distance")
    private Double distance;

    @Column(name = "photo_path", length = 255)
    private String photoPath;

    @Builder.Default
    @Column(name = "punch_state", length = 50)
    private String punchState = "CHECK_IN";

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

