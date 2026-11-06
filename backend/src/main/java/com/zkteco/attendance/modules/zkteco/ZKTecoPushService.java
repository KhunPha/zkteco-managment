package com.zkteco.attendance.modules.zkteco;

import com.zkteco.attendance.common.TimeUtils;
import com.zkteco.attendance.modules.attendance.AttendanceCalculationEngine;
import com.zkteco.attendance.modules.attendance.AttendanceRawLog;
import com.zkteco.attendance.modules.attendance.AttendanceRawLogRepository;
import com.zkteco.attendance.modules.device.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class ZKTecoPushService {

    private final DeviceRepository deviceRepository;
    private final DeviceCommandRepository commandRepository;
    private final AttendanceRawLogRepository rawLogRepository;
    private final DeviceSyncLogRepository syncLogRepository;
    private final AttendanceCalculationEngine calculationEngine;

    /**
     * Handle ADMS Handshake GET /iclock/cdata
     */
    @Transactional
    public String handleHandshake(String sn, String options, String pushver) {
        log.info("ADMS handshake from SN={}, pushver={}", sn, pushver);
        updateDeviceOnline(sn);

        return "GET OPTION FROM: " + sn + "\n" +
                "Stamp=9999\n" +
                "OpStamp=9999\n" +
                "ErrorDelay=60\n" +
                "Delay=30\n" +
                "TransTimes=00:00;14:00\n" +
                "TransInterval=1\n" +
                "TransFlag=TransData AttLog OpLog\n" +
                "TimeZone=7\n" +
                "Realtime=1\n" +
                "Encrypt=0";
    }

    /**
     * Ingest ADMS Push Data POST /iclock/cdata
     */
    @Transactional
    public String handlePushData(String sn, String table, String payload) {
        log.info("Received ADMS push from SN={}, table={}", sn, table);
        AttendanceDevice device = updateDeviceOnline(sn);

        if (payload == null || payload.trim().isEmpty()) {
            return "OK";
        }

        int count = 0;
        Set<LocalDate> affectedDates = new HashSet<>();
        if ("ATTLOG".equalsIgnoreCase(table) || table == null) {
            String[] lines = payload.split("\\r?\\n");
            for (String line : lines) {
                line = line.trim();
                if (line.isEmpty()) continue;

                // Typical formats:
                // Format A (tab separated): PIN\tYYYY-MM-DD HH:mm:ss\tSTATUS\tVERIFY\tWORKCODE
                // Format B (space separated): PIN YYYY-MM-DD HH:mm:ss STATUS VERIFY WORKCODE
                String[] tokens = line.split("[\\t ]+");
                if (tokens.length >= 3) {
                    try {
                        String pin = tokens[0].trim();
                        String timeStr = tokens[1].trim() + " " + tokens[2].trim();
                        Instant punchTime = TimeUtils.parseDeviceTime(timeStr);

                        String punchState = "CHECK_IN";
                        String verifyType = "OTHER";

                        if (tokens.length >= 4) {
                            punchState = parseStateCode(tokens[3]);
                        }
                        if (tokens.length >= 5) {
                            verifyType = parseVerifyCode(tokens[4]);
                        }

                        String rawKey = (sn != null ? sn : "") + "_" + pin + "_" + (punchTime != null ? punchTime.toString() : timeStr);
                        String idempotencyKey = hashKey(rawKey);

                        LocalDate punchDate = punchTime != null
                                ? punchTime.atZone(TimeUtils.PHNOM_PENH_ZONE).toLocalDate()
                                : LocalDate.now(TimeUtils.PHNOM_PENH_ZONE);
                        affectedDates.add(punchDate);

                        if (!rawLogRepository.existsByIdempotencyKey(idempotencyKey)) {
                            AttendanceRawLog rawLog = AttendanceRawLog.builder()
                                    .device(device)
                                    .deviceSn(sn != null ? sn : "UNKNOWN")
                                    .devicePin(pin)
                                    .punchTime(punchTime != null ? punchTime : Instant.now())
                                    .punchState(punchState)
                                    .verifyType(verifyType)
                                    .originalPayload(line)
                                    .idempotencyKey(idempotencyKey)
                                    .processed(false)
                                    .build();
                            rawLogRepository.save(rawLog);
                            count++;
                        }
                    } catch (Exception ex) {
                        log.warn("Error parsing ADMS attendance line: '{}': {}", line, ex.getMessage());
                    }
                }
            }

            if (device != null) {
                device.setLastSync(Instant.now());
                deviceRepository.save(device);

                DeviceSyncLog syncLog = DeviceSyncLog.builder()
                        .device(device)
                        .syncType("ADMS_PUSH_ATTLOG")
                        .status("SUCCESS")
                        .recordsRetrieved(lines.length)
                        .recordsInserted(count)
                        .completedAt(Instant.now())
                        .build();
                syncLogRepository.save(syncLog);
            }

            if (!affectedDates.isEmpty()) {
                rawLogRepository.flush();
                for (LocalDate date : affectedDates) {
                    try {
                        log.info("Auto-calculating daily attendance for date={} after receiving live punches", date);
                        calculationEngine.processAttendanceForDate(date);
                    } catch (Exception ex) {
                        log.error("Failed to auto-calculate attendance for date {}: {}", date, ex.getMessage(), ex);
                    }
                }
            }
        }

        return "OK: " + count;
    }

    /**
     * Poll Commands GET /iclock/getrequest
     */
    @Transactional
    public String pollPendingCommands(String sn) {
        updateDeviceOnline(sn);

        List<DeviceCommand> pending = commandRepository.findByDeviceSerialNumberAndStatusOrderByCreatedAtAsc(sn, "PENDING");
        if (pending.isEmpty()) {
            return "OK";
        }

        // Return the first pending command in ADMS format: C:ID:COMMAND
        DeviceCommand cmd = pending.get(0);
        cmd.setStatus("SENT");
        cmd.setSentAt(Instant.now());
        commandRepository.save(cmd);

        return "C:" + cmd.getId() + ":" + cmd.getCommandContent();
    }

    /**
     * Report Command Execution Result POST /iclock/devicecmd
     */
    @Transactional
    public String handleCommandResult(String sn, String body) {
        log.info("Device {} reported command result: {}", sn, body);
        updateDeviceOnline(sn);

        // Body format: ID=123&Return=0&CMD=...
        if (body != null && body.contains("ID=")) {
            try {
                for (String param : body.split("&")) {
                    String[] kv = param.split("=");
                    if (kv.length == 2 && "ID".equalsIgnoreCase(kv[0])) {
                        Long cmdId = Long.parseLong(kv[1].trim());
                        commandRepository.findById(cmdId).ifPresent(cmd -> {
                            cmd.setStatus("EXECUTED");
                            cmd.setResponseContent(body);
                            cmd.setExecutedAt(Instant.now());
                            commandRepository.save(cmd);
                        });
                    }
                }
            } catch (Exception ex) {
                log.warn("Error parsing command execution callback: {}", ex.getMessage());
            }
        }

        return "OK";
    }

    private AttendanceDevice updateDeviceOnline(String sn) {
        if (sn == null || sn.trim().isEmpty()) return null;
        Optional<AttendanceDevice> opt = deviceRepository.findBySerialNumber(sn.trim());
        if (opt.isPresent()) {
            AttendanceDevice dev = opt.get();
            dev.setConnectionStatus("ONLINE");
            dev.setLastCommunication(Instant.now());
            return deviceRepository.save(dev);
        }
        return null;
    }

    private String parseStateCode(String code) {
        return switch (code.trim()) {
            case "0" -> "CHECK_IN";
            case "1" -> "CHECK_OUT";
            case "2" -> "BREAK_OUT";
            case "3" -> "BREAK_IN";
            case "4" -> "OVERTIME_IN";
            case "5" -> "OVERTIME_OUT";
            default -> "CHECK_IN";
        };
    }

    private String parseVerifyCode(String code) {
        return switch (code.trim()) {
            case "1" -> "FINGERPRINT";
            case "2" -> "PASSWORD";
            case "3" -> "CARD";
            case "15" -> "FACE";
            default -> "OTHER";
        };
    }

    private String hashKey(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception ex) {
            return String.valueOf(input.hashCode());
        }
    }
}

