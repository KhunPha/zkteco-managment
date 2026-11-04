package com.zkteco.attendance.modules.device;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "device_commands")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeviceCommand {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private AttendanceDevice device;

    @Column(name = "command_content", nullable = false, columnDefinition = "TEXT")
    private String commandContent;

    @Builder.Default
    @Column(nullable = false, length = 50)
    private String status = "PENDING"; // PENDING, SENT, EXECUTED, FAILED

    @Column(name = "response_content", columnDefinition = "TEXT")
    private String responseContent;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "executed_at")
    private Instant executedAt;
}

