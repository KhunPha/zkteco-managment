package com.zkteco.attendance.modules.device;

import com.fasterxml.jackson.databind.JsonNode;
import com.zkteco.attendance.common.AppException;
import com.zkteco.attendance.common.ErrorCode;
import com.zkteco.attendance.common.PageResponse;
import com.zkteco.attendance.common.ResourceNotFoundException;
import com.zkteco.attendance.common.TimeUtils;
import com.zkteco.attendance.modules.attendance.AttendanceRawLog;
import com.zkteco.attendance.modules.attendance.AttendanceRawLogRepository;
import com.zkteco.attendance.modules.device.dto.*;
import com.zkteco.attendance.modules.organization.BranchRepository;
import com.zkteco.attendance.modules.organization.DepartmentRepository;
import com.zkteco.attendance.modules.personnel.Employee;
import com.zkteco.attendance.modules.personnel.Employee;
import com.zkteco.attendance.modules.personnel.EmployeeRepository;
import com.zkteco.attendance.modules.personnel.Student;
import com.zkteco.attendance.modules.personnel.StudentRepository;
import com.zkteco.attendance.modules.zkteco.DeviceInfo;
import com.zkteco.attendance.modules.zkteco.RawAttendanceRecord;
import com.zkteco.attendance.modules.zkteco.RawDeviceUser;
import com.zkteco.attendance.modules.zkteco.ZKTecoTcpClient;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final DeviceUserRepository deviceUserRepository;
    private final DeviceSyncLogRepository syncLogRepository;
    private final DeviceOperationLogRepository operationLogRepository;
    private final DeviceCommandRepository commandRepository;
    private final AttendanceRawLogRepository rawLogRepository;
    private final BranchRepository branchRepository;
    private final DepartmentRepository departmentRepository;
    private final EmployeeRepository employeeRepository;
    private final StudentRepository studentRepository;
    private final ZKTecoTcpClient tcpClient;
    private final CardHistoryRepository cardHistoryRepository;
    private final TerminalSyncService terminalSyncService;
    private final ZkDeviceMasterControlService masterControlService;

    // Devices CRUD
    @Transactional(readOnly = true)
    public PageResponse<DeviceDto> getDevices(String search, String status, Pageable pageable) {
        Specification<AttendanceDevice> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (search != null && !search.trim().isEmpty()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("serialNumber")), pattern),
                        cb.like(cb.lower(root.get("ipAddress")), pattern),
                        cb.like(cb.lower(root.get("location")), pattern)
                ));
            }
            if (status != null && !status.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("connectionStatus"), status.trim().toUpperCase()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<AttendanceDevice> page = deviceRepository.findAll(spec, pageable);
        List<DeviceDto> dtos = page.getContent().stream().map(this::toDeviceDto).collect(Collectors.toList());
        return PageResponse.of(page, dtos);
    }

    @Transactional(readOnly = true)
    public DeviceDto getDeviceById(Long id) {
        return toDeviceDto(findDevice(id));
    }

    @Transactional
    public DeviceDto createDevice(CreateDeviceRequest request) {
        if (deviceRepository.existsBySerialNumber(request.getSerialNumber())) {
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Serial number already registered: " + request.getSerialNumber());
        }

        AttendanceDevice device = AttendanceDevice.builder()
                .name(request.getName().trim())
                .serialNumber(request.getSerialNumber().trim().toUpperCase())
                .model(request.getModel())
                .ipAddress(request.getIpAddress())
                .port(request.getPort() != null ? request.getPort() : 4370)
                .commKey(request.getCommKey() != null ? request.getCommKey() : "0")
                .integrationType(request.getIntegrationType() != null ? request.getIntegrationType() : "ADMS_PUSH")
                .location(request.getLocation())
                .description(request.getDescription())
                .active(request.getActive() != null ? request.getActive() : true)
                .connectionStatus("OFFLINE")
                .build();

        if (request.getBranchId() != null) {
            branchRepository.findById(request.getBranchId()).ifPresent(device::setBranch);
        }
        if (request.getDepartmentId() != null) {
            departmentRepository.findById(request.getDepartmentId()).ifPresent(device::setDepartment);
        }

        return toDeviceDto(deviceRepository.save(device));
    }

    @Transactional
    public DeviceDto updateDevice(Long id, CreateDeviceRequest request) {
        AttendanceDevice device = findDevice(id);

        device.setName(request.getName().trim());
        if (request.getModel() != null) device.setModel(request.getModel());
        if (request.getIpAddress() != null) device.setIpAddress(request.getIpAddress());
        if (request.getPort() != null) device.setPort(request.getPort());
        if (request.getCommKey() != null) device.setCommKey(request.getCommKey());
        if (request.getIntegrationType() != null) device.setIntegrationType(request.getIntegrationType());
        if (request.getLocation() != null) device.setLocation(request.getLocation());
        if (request.getDescription() != null) device.setDescription(request.getDescription());
        if (request.getActive() != null) device.setActive(request.getActive());

        if (request.getBranchId() != null) {
            device.setBranch(branchRepository.findById(request.getBranchId()).orElse(null));
        }
        if (request.getDepartmentId() != null) {
            device.setDepartment(departmentRepository.findById(request.getDepartmentId()).orElse(null));
        }

        return toDeviceDto(deviceRepository.save(device));
    }

    @Transactional
    public void deleteDevice(Long id) {
        deviceRepository.deleteById(id);
    }

    // Hardware Operations
    @Transactional
    public boolean testConnection(Long id) {
        AttendanceDevice device = findDevice(id);
        boolean reachable = false;

        // First attempt direct TCP probe via master control utility if IP is present
        if (device.getIpAddress() != null && !device.getIpAddress().isBlank()) {
            JsonNode info = masterControlService.execute(device.getIpAddress(), device.getPort(), "get-info", null);
            if (info != null && info.path("success").asBoolean(false)) {
                reachable = true;
                if (info.hasNonNull("firmware_version") && !info.path("firmware_version").asText().isBlank()) {
                    device.setFirmwareVersion(info.path("firmware_version").asText());
                }
            }
        }

        if (!reachable) {
            boolean isAdms = "ADMS_PUSH".equalsIgnoreCase(device.getIntegrationType()) ||
                             "ADMS".equalsIgnoreCase(device.getIntegrationType());

            if (isAdms) {
                // For ADMS Push: check recent heartbeat communication (within last 10 minutes)
                if (device.getLastCommunication() != null &&
                        device.getLastCommunication().isAfter(Instant.now().minusSeconds(600))) {
                    reachable = true;
                } else if (device.getSerialNumber() != null && device.getSerialNumber().startsWith("ZK-SIM")) {
                    reachable = true;
                } else if (device.getIpAddress() != null && !device.getIpAddress().isBlank()) {
                    reachable = tcpClient.testConnection(device.getIpAddress(), device.getPort(), device.getCommKey());
                }
            } else {
                if (device.getIpAddress() != null && !device.getIpAddress().isBlank()) {
                    reachable = tcpClient.testConnection(device.getIpAddress(), device.getPort(), device.getCommKey());
                } else if (device.getSerialNumber() != null && device.getSerialNumber().startsWith("ZK-SIM")) {
                    reachable = true;
                }
            }
        }

        device.setConnectionStatus(reachable ? "ONLINE" : "OFFLINE");
        if (reachable) {
            device.setLastCommunication(Instant.now());
        }
        deviceRepository.save(device);

        recordOperation(device, "TEST_CONNECTION", "ONLINE=" + reachable, reachable ? "SUCCESS" : "FAILED", null);
        return reachable;
    }

    @Transactional
    public DeviceControlResponseDto syncTime(Long id) {
        AttendanceDevice device = findDevice(id);
        boolean success = false;
        String message = "";
        Double drift = null;
        String machineTime = null;
        String computerTime = null;

        if (device.getIpAddress() != null && !device.getIpAddress().isBlank()) {
            JsonNode res = masterControlService.execute(device.getIpAddress(), device.getPort(), "sync-time", null);
            if (res != null && res.path("success").asBoolean(false)) {
                success = true;
                message = res.path("message").asText("Hardware clock synchronized successfully");
                drift = res.hasNonNull("drift_seconds") ? res.path("drift_seconds").asDouble() : 0.0;
                machineTime = res.path("machine_time").asText(null);
                computerTime = res.path("computer_time").asText(null);

                device.setConnectionStatus("ONLINE");
                device.setLastCommunication(Instant.now());
                deviceRepository.save(device);
            } else {
                message = res != null && res.hasNonNull("message") ? res.path("message").asText() : "TCP sync failed";
            }
        }

        if (!success) {
            boolean isAdms = "ADMS_PUSH".equalsIgnoreCase(device.getIntegrationType()) ||
                             "ADMS".equalsIgnoreCase(device.getIntegrationType());
            if (isAdms) {
                queueCommand(device, "SET TIME " + TimeUtils.formatPhnomPenh(Instant.now()));
                device.setLastCommunication(Instant.now());
                deviceRepository.save(device);
                success = true;
                message = "Queued ADMS SET TIME command";
            }
        }

        recordOperation(device, "SYNC_TIME", "TargetTime=" + Instant.now() + " Result=" + message, success ? "SUCCESS" : "FAILED", success ? null : message);

        return DeviceControlResponseDto.builder()
                .deviceId(device.getId())
                .deviceName(device.getName())
                .serialNumber(device.getSerialNumber())
                .ipAddress(device.getIpAddress())
                .success(success)
                .action("SYNC_TIME")
                .message(message)
                .driftSeconds(drift)
                .machineTime(machineTime)
                .computerTime(computerTime)
                .build();
    }

    @Transactional
    public List<DeviceControlResponseDto> syncAllDevicesTime() {
        List<AttendanceDevice> devices = deviceRepository.findAll().stream()
                .filter(AttendanceDevice::isActive)
                .toList();

        List<DeviceControlResponseDto> results = new ArrayList<>();
        for (AttendanceDevice device : devices) {
            try {
                results.add(syncTime(device.getId()));
            } catch (Exception e) {
                log.error("Failed to sync time for device {}: {}", device.getName(), e.getMessage());
                results.add(DeviceControlResponseDto.builder()
                        .deviceId(device.getId())
                        .deviceName(device.getName())
                        .serialNumber(device.getSerialNumber())
                        .ipAddress(device.getIpAddress())
                        .success(false)
                        .action("SYNC_TIME")
                        .message("Sync error: " + e.getMessage())
                        .build());
            }
        }
        return results;
    }

    @Transactional
    public DeviceLiveStatusDto getDeviceLiveStatus(Long id) {
        AttendanceDevice device = findDevice(id);

        if (device.getIpAddress() != null && !device.getIpAddress().isBlank()) {
            JsonNode info = masterControlService.execute(device.getIpAddress(), device.getPort(), "get-info", null);
            if (info != null && info.path("success").asBoolean(false)) {
                device.setConnectionStatus("ONLINE");
                if (info.hasNonNull("firmware_version") && !info.path("firmware_version").asText().isBlank()) {
                    device.setFirmwareVersion(info.path("firmware_version").asText());
                }
                device.setLastCommunication(Instant.now());
                deviceRepository.save(device);

                return DeviceLiveStatusDto.builder()
                        .deviceId(device.getId())
                        .deviceName(device.getName())
                        .serialNumber(info.path("serial_number").asText(device.getSerialNumber()))
                        .ipAddress(device.getIpAddress())
                        .port(device.getPort())
                        .online(true)
                        .machineTime(info.path("machine_time").asText(null))
                        .computerTime(info.path("computer_time").asText(null))
                        .driftSeconds(info.hasNonNull("drift_seconds") ? info.path("drift_seconds").asDouble() : null)
                        .usersCount(info.hasNonNull("users_count") ? info.path("users_count").asInt() : null)
                        .attendanceCount(info.hasNonNull("attendance_count") ? info.path("attendance_count").asInt() : null)
                        .firmwareVersion(info.path("firmware_version").asText(device.getFirmwareVersion()))
                        .platform(info.path("platform").asText(null))
                        .macAddress(info.path("mac_address").asText(null))
                        .message("Live hardware status retrieved")
                        .build();
            }
        }

        return DeviceLiveStatusDto.builder()
                .deviceId(device.getId())
                .deviceName(device.getName())
                .serialNumber(device.getSerialNumber())
                .ipAddress(device.getIpAddress())
                .port(device.getPort())
                .online("ONLINE".equalsIgnoreCase(device.getConnectionStatus()))
                .firmwareVersion(device.getFirmwareVersion())
                .message("Device offline or unreachable via TCP")
                .build();
    }

    @Transactional
    public DeviceControlResponseDto controlDevice(Long id, DeviceControlRequest request) {
        AttendanceDevice device = findDevice(id);
        String action = request.getAction().trim().toUpperCase();

        if ("SYNC_TIME".equals(action)) {
            return syncTime(id);
        }

        String command;
        switch (action) {
            case "RESTART" -> command = "restart";
            case "POWER_OFF" -> command = "poweroff";
            case "DISABLE" -> command = "disable";
            case "ENABLE" -> command = "enable";
            case "TEST_VOICE" -> command = "test-voice";
            case "CLEAR_LOGS" -> command = "clear-attlog";
            case "CLEAR_ADMIN" -> command = "clear-admin";
            case "UNLOCK_DOOR" -> command = "unlock-door";
            default -> throw new AppException(ErrorCode.BAD_REQUEST, "Unknown device control action: " + action);
        }

        boolean success = false;
        String message = "";

        if (device.getIpAddress() != null && !device.getIpAddress().isBlank()) {
            JsonNode res = masterControlService.execute(device.getIpAddress(), device.getPort(), command, request.getVoiceIndex());
            if (res != null) {
                success = res.path("success").asBoolean(false);
                message = res.path("message").asText(success ? "Operation completed" : "Operation failed");
            }
        }

        if (!success && ("ADMS_PUSH".equalsIgnoreCase(device.getIntegrationType()) || "ADMS".equalsIgnoreCase(device.getIntegrationType()))) {
            if ("RESTART".equals(action)) {
                queueCommand(device, "REBOOT");
                success = true;
                message = "Queued ADMS REBOOT command";
            }
        }

        recordOperation(device, action, "Params: voiceIndex=" + request.getVoiceIndex(), success ? "SUCCESS" : "FAILED", success ? null : message);

        return DeviceControlResponseDto.builder()
                .deviceId(device.getId())
                .deviceName(device.getName())
                .serialNumber(device.getSerialNumber())
                .ipAddress(device.getIpAddress())
                .success(success)
                .action(action)
                .message(message)
                .build();
    }

    @Transactional
    public int pullAttendanceLogs(Long id) {
        AttendanceDevice device = findDevice(id);
        int inserted = 0;
        boolean isAdms = "ADMS_PUSH".equalsIgnoreCase(device.getIntegrationType()) ||
                         "ADMS".equalsIgnoreCase(device.getIntegrationType());

        if (!isAdms && device.getIpAddress() != null) {
            List<RawAttendanceRecord> records = tcpClient.getAttendanceRecords(
                    device.getIpAddress(), device.getPort(), device.getCommKey(), device.getSerialNumber()
            );

            for (RawAttendanceRecord r : records) {
                String rawKey = device.getSerialNumber() + "_" + r.getUserPin() + "_" + r.getPunchTime();
                String idempotencyKey = hashKey(rawKey);

                if (!rawLogRepository.existsByIdempotencyKey(idempotencyKey)) {
                    AttendanceRawLog logEntry = AttendanceRawLog.builder()
                            .device(device)
                            .deviceSn(device.getSerialNumber())
                            .devicePin(r.getUserPin())
                            .punchTime(r.getPunchTime())
                            .punchState(r.getPunchState() != null ? r.getPunchState() : "CHECK_IN")
                            .verifyType(r.getVerifyType() != null ? r.getVerifyType() : "OTHER")
                            .workCode(r.getWorkCode())
                            .idempotencyKey(idempotencyKey)
                            .processed(false)
                            .build();
                    rawLogRepository.save(logEntry);
                    inserted++;
                }
            }

            device.setLastSync(Instant.now());
            device.setConnectionStatus("ONLINE");
            deviceRepository.save(device);

            DeviceSyncLog syncLog = DeviceSyncLog.builder()
                    .device(device)
                    .syncType("TCP_PULL_ATTLOG")
                    .status("SUCCESS")
                    .recordsRetrieved(records.size())
                    .recordsInserted(inserted)
                    .completedAt(Instant.now())
                    .build();
            syncLogRepository.save(syncLog);
        } else {
            // For ADMS, queue command to upload attendance log
            queueCommand(device, "CHECK");
            device.setLastCommunication(Instant.now());
            deviceRepository.save(device);
            inserted = 0;
        }

        return inserted;
    }

    @Transactional
    public boolean restartDevice(Long id) {
        DeviceControlResponseDto resp = controlDevice(id, DeviceControlRequest.builder().action("RESTART").build());
        return resp.isSuccess();
    }

    public JsonNode getDeviceMenuParameters(Long id) {
        AttendanceDevice device = findDevice(id);
        return masterControlService.getMenuParameters(device.getIpAddress(), device.getPort());
    }

    @Transactional
    public JsonNode setDeviceMenuParameters(Long id, JsonNode params) {
        AttendanceDevice device = findDevice(id);
        JsonNode result = masterControlService.setMenuParameters(device.getIpAddress(), device.getPort(), params);
        recordOperation(device, "SET_MENU_PARAMETERS", "Params: " + params, result != null && result.path("success").asBoolean(false) ? "SUCCESS" : "FAILED", null);
        return result;
    }

    // Device Users
    @Transactional(readOnly = true)
    public PageResponse<DeviceUserDto> getDeviceUsers(Long deviceId, String search, Pageable pageable) {
        return getDeviceUsers(deviceId, search, null, null, null, null, pageable);
    }

    @Transactional(readOnly = true)
    public PageResponse<DeviceUserDto> getDeviceUsers(Long deviceId, String search, String status, Pageable pageable) {
        return getDeviceUsers(deviceId, search, status, null, null, null, pageable);
    }

    @Transactional(readOnly = true)
    public PageResponse<DeviceUserDto> getDeviceUsers(
            Long deviceId, String search, String status, String biometricFilter, String personnelType, String sortBy, Pageable pageable) {
        Specification<AttendanceDeviceUser> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (deviceId != null) {
                predicates.add(cb.equal(root.get("device").get("id"), deviceId));
            }
            if (status != null && !status.trim().isEmpty() && !"ALL".equalsIgnoreCase(status)) {
                predicates.add(cb.equal(cb.upper(root.get("status")), status.trim().toUpperCase()));
            }

            if (biometricFilter != null && !biometricFilter.trim().isEmpty() && !"ALL".equalsIgnoreCase(biometricFilter)) {
                if ("HAS_FP".equalsIgnoreCase(biometricFilter)) {
                    predicates.add(cb.gt(root.get("fingerprintCount"), 0));
                } else if ("NO_FP".equalsIgnoreCase(biometricFilter)) {
                    predicates.add(cb.equal(root.get("fingerprintCount"), 0));
                } else if ("HAS_CARD".equalsIgnoreCase(biometricFilter)) {
                    predicates.add(cb.and(
                            cb.isNotNull(root.get("cardNumber")),
                            cb.notEqual(root.get("cardNumber"), "")
                    ));
                } else if ("NO_CARD".equalsIgnoreCase(biometricFilter)) {
                    predicates.add(cb.or(
                            cb.isNull(root.get("cardNumber")),
                            cb.equal(root.get("cardNumber"), "")
                    ));
                }
            }

            if (personnelType != null && !personnelType.trim().isEmpty() && !"ALL".equalsIgnoreCase(personnelType)) {
                if ("STUDENT".equalsIgnoreCase(personnelType)) {
                    predicates.add(cb.isNotNull(root.get("student")));
                } else if ("EMPLOYEE".equalsIgnoreCase(personnelType) || "TEACHER".equalsIgnoreCase(personnelType)) {
                    predicates.add(cb.isNotNull(root.get("employee")));
                } else if ("UNMAPPED".equalsIgnoreCase(personnelType)) {
                    predicates.add(cb.and(cb.isNull(root.get("employee")), cb.isNull(root.get("student"))));
                }
            }

            if (search != null && !search.trim().isEmpty()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Join<AttendanceDeviceUser, Employee> empJoin = root.join("employee", JoinType.LEFT);
                Join<AttendanceDeviceUser, Student> stuJoin = root.join("student", JoinType.LEFT);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("devicePin")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("nameOnDevice"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("cardNumber"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(empJoin.get("englishName"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(empJoin.get("khmerName"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(empJoin.get("employeeCode"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(stuJoin.get("englishName"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(stuJoin.get("khmerName"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(stuJoin.get("studentCode"), "")), pattern)
                ));
            }

            // Natural numeric and user-directed sorting
            if (query != null && !Long.class.equals(query.getResultType())) {
                if ("PIN_ASC".equalsIgnoreCase(sortBy)) {
                    query.orderBy(cb.asc(cb.length(root.get("devicePin"))), cb.asc(root.get("devicePin")));
                } else if ("PIN_DESC".equalsIgnoreCase(sortBy)) {
                    query.orderBy(cb.desc(cb.length(root.get("devicePin"))), cb.desc(root.get("devicePin")));
                } else if ("NAME_ASC".equalsIgnoreCase(sortBy)) {
                    query.orderBy(cb.asc(cb.lower(cb.coalesce(root.get("nameOnDevice"), ""))));
                } else if ("NAME_DESC".equalsIgnoreCase(sortBy)) {
                    query.orderBy(cb.desc(cb.lower(cb.coalesce(root.get("nameOnDevice"), ""))));
                } else if ("FP_FIRST".equalsIgnoreCase(sortBy)) {
                    query.orderBy(cb.desc(root.get("fingerprintCount")), cb.asc(cb.length(root.get("devicePin"))), cb.asc(root.get("devicePin")));
                } else if ("NO_FP_FIRST".equalsIgnoreCase(sortBy)) {
                    query.orderBy(cb.asc(root.get("fingerprintCount")), cb.asc(cb.length(root.get("devicePin"))), cb.asc(root.get("devicePin")));
                } else if ("CARD_FIRST".equalsIgnoreCase(sortBy)) {
                    query.orderBy(cb.desc(cb.coalesce(root.get("cardNumber"), "")), cb.asc(cb.length(root.get("devicePin"))), cb.asc(root.get("devicePin")));
                } else if ("RECENT".equalsIgnoreCase(sortBy)) {
                    query.orderBy(cb.desc(cb.coalesce(root.get("lastSyncedAt"), root.get("id"))));
                } else {
                    // Default: Natural numeric PIN ascending (1, 2, 3 ... 1000 ... 40001)
                    query.orderBy(cb.asc(cb.length(root.get("devicePin"))), cb.asc(root.get("devicePin")));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<AttendanceDeviceUser> page = deviceUserRepository.findAll(spec, pageable);
        Map<String, Integer> countMap = new HashMap<>();
        try {
            List<Object[]> counts = cardHistoryRepository.countGroupedByDevicePin();
            for (Object[] row : counts) {
                if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                    countMap.put((String) row[0], ((Number) row[1]).intValue());
                }
            }
        } catch (Exception ignored) {}

        List<DeviceUserDto> dtos = page.getContent().stream()
                .map(u -> toDeviceUserDto(u, countMap.getOrDefault(u.getDevicePin(), 0)))
                .collect(Collectors.toList());
        return PageResponse.of(page, dtos);
    }

    @Transactional
    public DeviceUserDto updateDeviceUserStatus(Long id, String status) {
        AttendanceDeviceUser devUser = deviceUserRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DeviceUser", "id", id));
        String newStatus = "INACTIVE".equalsIgnoreCase(status) ? "INACTIVE" : "ACTIVE";
        devUser.setStatus(newStatus);
        devUser.setSyncStatus("SYNCED");
        devUser.setLastSyncedAt(Instant.now());
        AttendanceDeviceUser saved = deviceUserRepository.save(devUser);
        return toDeviceUserDto(saved);
    }

    @Transactional
    public DeviceUserDto createDeviceUser(CreateDeviceUserRequest request) {
        AttendanceDevice device = findDevice(request.getDeviceId());
        if (deviceUserRepository.existsByDeviceIdAndDevicePin(device.getId(), request.getDevicePin())) {
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "PIN " + request.getDevicePin() + " already exists on device " + device.getName());
        }

        AttendanceDeviceUser devUser = AttendanceDeviceUser.builder()
                .device(device)
                .devicePin(request.getDevicePin().trim())
                .nameOnDevice(request.getNameOnDevice())
                .privilege(request.getPrivilege() != null ? request.getPrivilege() : "NORMAL_USER")
                .cardNumber(request.getCardNumber())
                .password(request.getPassword())
                .faceEnrolled(request.getFaceEnrolled() != null && request.getFaceEnrolled())
                .fingerprintCount(request.getFingerprintCount() != null ? request.getFingerprintCount() : 0)
                .syncStatus("SYNCED")
                .lastSyncedAt(Instant.now())
                .build();

        if (request.getEmployeeId() != null) {
            employeeRepository.findById(request.getEmployeeId()).ifPresent(devUser::setEmployee);
        }
        if (request.getStudentId() != null) {
            studentRepository.findById(request.getStudentId()).ifPresent(devUser::setStudent);
        }

        AttendanceDeviceUser saved = deviceUserRepository.save(devUser);
        queueUserToDevice(device, saved);
        return toDeviceUserDto(saved);
    }

    @Transactional
    public DeviceUserDto updateDeviceUser(Long id, CreateDeviceUserRequest request) {
        AttendanceDeviceUser devUser = deviceUserRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DeviceUser", "id", id));

        if (request.getDevicePin() != null && !request.getDevicePin().trim().isEmpty()) {
            String newPin = request.getDevicePin().trim();
            if (!newPin.equalsIgnoreCase(devUser.getDevicePin())) {
                if (deviceUserRepository.existsByDeviceIdAndDevicePin(devUser.getDevice().getId(), newPin)) {
                    throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "PIN " + newPin + " already exists on device " + devUser.getDevice().getName());
                }
                devUser.setDevicePin(newPin);
            }
        }

        devUser.setNameOnDevice(request.getNameOnDevice());
        if (request.getPrivilege() != null) devUser.setPrivilege(request.getPrivilege());
        if (request.getCardNumber() != null) {
            String newCard = request.getCardNumber().trim();
            if (devUser.getCardNumber() == null || !devUser.getCardNumber().equals(newCard)) {
                recordCardTransition(devUser, devUser.getCardNumber(), newCard, "2026-2027", "Device user profile update", LocalDate.now(), null);
                devUser.setCardNumber(newCard);
            }
        }
        if (request.getPassword() != null) devUser.setPassword(request.getPassword());
        if (request.getFaceEnrolled() != null) devUser.setFaceEnrolled(request.getFaceEnrolled());
        if (request.getFingerprintCount() != null) devUser.setFingerprintCount(request.getFingerprintCount());

        if (request.getEmployeeId() != null) {
            devUser.setEmployee(employeeRepository.findById(request.getEmployeeId()).orElse(null));
        }
        if (request.getStudentId() != null) {
            devUser.setStudent(studentRepository.findById(request.getStudentId()).orElse(null));
        }

        devUser.setLastSyncedAt(Instant.now());
        AttendanceDeviceUser saved = deviceUserRepository.save(devUser);
        queueUserToDevice(saved.getDevice(), saved);

        if (saved.getEmployee() != null) {
            List<AttendanceDeviceUser> siblings = deviceUserRepository.findByEmployeeId(saved.getEmployee().getId());
            for (AttendanceDeviceUser sib : siblings) {
                if (!sib.getId().equals(saved.getId())) {
                    if (request.getCardNumber() != null) sib.setCardNumber(request.getCardNumber().trim());
                    if (request.getPassword() != null) sib.setPassword(request.getPassword());
                    if (request.getNameOnDevice() != null) sib.setNameOnDevice(request.getNameOnDevice());
                    if (request.getFaceEnrolled() != null) sib.setFaceEnrolled(request.getFaceEnrolled());
                    if (request.getFingerprintCount() != null) sib.setFingerprintCount(request.getFingerprintCount());
                    sib.setLastSyncedAt(Instant.now());
                    AttendanceDeviceUser sibSaved = deviceUserRepository.save(sib);
                    queueUserToDevice(sibSaved.getDevice(), sibSaved);
                }
            }
        } else if (saved.getStudent() != null) {
            List<AttendanceDeviceUser> siblings = deviceUserRepository.findByStudentId(saved.getStudent().getId());
            for (AttendanceDeviceUser sib : siblings) {
                if (!sib.getId().equals(saved.getId())) {
                    if (request.getCardNumber() != null) sib.setCardNumber(request.getCardNumber().trim());
                    if (request.getPassword() != null) sib.setPassword(request.getPassword());
                    if (request.getNameOnDevice() != null) sib.setNameOnDevice(request.getNameOnDevice());
                    if (request.getFaceEnrolled() != null) sib.setFaceEnrolled(request.getFaceEnrolled());
                    if (request.getFingerprintCount() != null) sib.setFingerprintCount(request.getFingerprintCount());
                    sib.setLastSyncedAt(Instant.now());
                    AttendanceDeviceUser sibSaved = deviceUserRepository.save(sib);
                    queueUserToDevice(sibSaved.getDevice(), sibSaved);
                }
            }
        }

        return toDeviceUserDto(saved);
    }

    @Transactional
    public DeviceUserDto enrollBiometrics(Long deviceUserId, Boolean faceEnrolled, Integer fingerprintCount, String cardNumber) {
        AttendanceDeviceUser devUser = deviceUserRepository.findById(deviceUserId)
                .orElseThrow(() -> new ResourceNotFoundException("DeviceUser", "id", deviceUserId));

        if (faceEnrolled != null) devUser.setFaceEnrolled(faceEnrolled);
        if (fingerprintCount != null) devUser.setFingerprintCount(fingerprintCount);
        if (cardNumber != null) {
            String newCard = cardNumber.trim();
            if (devUser.getCardNumber() == null || !devUser.getCardNumber().equals(newCard)) {
                recordCardTransition(devUser, devUser.getCardNumber(), newCard, "2026-2027", "Biometric enrollment update", LocalDate.now(), null);
                devUser.setCardNumber(newCard);
            }
        }
        devUser.setLastSyncedAt(Instant.now());

        AttendanceDeviceUser saved = deviceUserRepository.save(devUser);
        queueUserToDevice(saved.getDevice(), saved);

        if (saved.getEmployee() != null) {
            List<AttendanceDeviceUser> siblings = deviceUserRepository.findByEmployeeId(saved.getEmployee().getId());
            for (AttendanceDeviceUser sib : siblings) {
                if (!sib.getId().equals(saved.getId())) {
                    if (cardNumber != null) sib.setCardNumber(cardNumber.trim());
                    if (faceEnrolled != null) sib.setFaceEnrolled(faceEnrolled);
                    if (fingerprintCount != null) sib.setFingerprintCount(fingerprintCount);
                    sib.setLastSyncedAt(Instant.now());
                    AttendanceDeviceUser sibSaved = deviceUserRepository.save(sib);
                    queueUserToDevice(sibSaved.getDevice(), sibSaved);
                }
            }
        } else if (saved.getStudent() != null) {
            List<AttendanceDeviceUser> siblings = deviceUserRepository.findByStudentId(saved.getStudent().getId());
            for (AttendanceDeviceUser sib : siblings) {
                if (!sib.getId().equals(saved.getId())) {
                    if (cardNumber != null) sib.setCardNumber(cardNumber.trim());
                    if (faceEnrolled != null) sib.setFaceEnrolled(faceEnrolled);
                    if (fingerprintCount != null) sib.setFingerprintCount(fingerprintCount);
                    sib.setLastSyncedAt(Instant.now());
                    AttendanceDeviceUser sibSaved = deviceUserRepository.save(sib);
                    queueUserToDevice(sibSaved.getDevice(), sibSaved);
                }
            }
        }

        recordOperation(saved.getDevice(), "ENROLL_BIOMETRICS",
                "PIN=" + saved.getDevicePin() + " Face=" + saved.isFaceEnrolled() + " FP=" + saved.getFingerprintCount(),
                "SUCCESS", null);

        return toDeviceUserDto(saved);
    }

    /**
     * Change Card Number for annual re-issue, card replacement, or renewal while preserving historical cards.
     */
    @Transactional
    public DeviceUserDto changeCardNumber(Long deviceUserId, ChangeCardRequest request) {
        AttendanceDeviceUser devUser = deviceUserRepository.findById(deviceUserId)
                .orElseThrow(() -> new ResourceNotFoundException("DeviceUser", "id", deviceUserId));

        String newCard = request.getNewCardNumber() != null ? request.getNewCardNumber().trim() : "";
        String oldCard = devUser.getCardNumber();
        String academicYear = request.getAcademicYear() != null ? request.getAcademicYear() : "2026-2027";
        String notes = request.getNotes() != null ? request.getNotes() : "Annual RFID Card Renewal";
        LocalDate issuedDate = request.getIssuedDate() != null ? request.getIssuedDate() : LocalDate.now();

        // 1. Record transition in Card History
        recordCardTransition(devUser, oldCard, newCard, academicYear, notes, issuedDate, request.getExpiryDate());

        // 2. Update active card on Device User
        devUser.setCardNumber(newCard);
        devUser.setLastSyncedAt(Instant.now());
        AttendanceDeviceUser saved = deviceUserRepository.save(devUser);
        queueUserToDevice(saved.getDevice(), saved);

        // 3. Update sibling device users across all physical terminals
        if (saved.getEmployee() != null) {
            List<AttendanceDeviceUser> siblings = deviceUserRepository.findByEmployeeId(saved.getEmployee().getId());
            for (AttendanceDeviceUser sib : siblings) {
                if (!sib.getId().equals(saved.getId())) {
                    sib.setCardNumber(newCard);
                    sib.setLastSyncedAt(Instant.now());
                    AttendanceDeviceUser sibSaved = deviceUserRepository.save(sib);
                    queueUserToDevice(sibSaved.getDevice(), sibSaved);
                }
            }
        } else if (saved.getStudent() != null) {
            List<AttendanceDeviceUser> siblings = deviceUserRepository.findByStudentId(saved.getStudent().getId());
            for (AttendanceDeviceUser sib : siblings) {
                if (!sib.getId().equals(saved.getId())) {
                    sib.setCardNumber(newCard);
                    sib.setLastSyncedAt(Instant.now());
                    AttendanceDeviceUser sibSaved = deviceUserRepository.save(sib);
                    queueUserToDevice(sibSaved.getDevice(), sibSaved);
                }
            }
        }

        recordOperation(saved.getDevice(), "CHANGE_CARD_NUMBER",
                "PIN=" + saved.getDevicePin() + " OldCard=" + oldCard + " NewCard=" + newCard + " Year=" + academicYear,
                "SUCCESS", null);

        return toDeviceUserDto(saved);
    }

    private void recordCardTransition(AttendanceDeviceUser user, String oldCard, String newCard, String academicYear,
                                       String notes, LocalDate issuedDate, LocalDate expiryDate) {
        if (oldCard != null && !oldCard.isBlank() && !oldCard.equals(newCard)) {
            // Mark previous active cards for this pin as REPLACED
            List<CardHistory> activeHistories = cardHistoryRepository.findByDevicePinOrderByCreatedAtDesc(user.getDevicePin());
            for (CardHistory ch : activeHistories) {
                if ("ACTIVE".equalsIgnoreCase(ch.getStatus())) {
                    ch.setStatus("REPLACED");
                    ch.setReplacedAt(Instant.now());
                    cardHistoryRepository.save(ch);
                }
            }
        }

        if (newCard != null && !newCard.isBlank()) {
            CardHistory history = CardHistory.builder()
                    .devicePin(user.getDevicePin())
                    .cardNumber(newCard)
                    .previousCardNumber(oldCard)
                    .academicYear(academicYear != null ? academicYear : "2026-2027")
                    .status("ACTIVE")
                    .issuedDate(issuedDate != null ? issuedDate : LocalDate.now())
                    .expiryDate(expiryDate)
                    .notes(notes)
                    .employee(user.getEmployee())
                    .student(user.getStudent())
                    .build();
            cardHistoryRepository.save(history);
        }
    }

    @Transactional(readOnly = true)
    public List<CardHistoryDto> getCardHistory(Long deviceUserId) {
        AttendanceDeviceUser devUser = deviceUserRepository.findById(deviceUserId)
                .orElseThrow(() -> new ResourceNotFoundException("DeviceUser", "id", deviceUserId));
        return getCardHistoryByPin(devUser.getDevicePin());
    }

    @Transactional(readOnly = true)
    public List<CardHistoryDto> getCardHistoryByPin(String pin) {
        return cardHistoryRepository.findByDevicePinOrderByCreatedAtDesc(pin).stream()
                .map(this::toCardHistoryDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PageResponse<CardHistoryDto> getAllCardHistory(String search, Pageable pageable) {
        Page<CardHistory> page;
        if (search != null && !search.trim().isEmpty()) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            Specification<CardHistory> spec = (root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("devicePin")), pattern),
                    cb.like(cb.lower(root.get("cardNumber")), pattern),
                    cb.like(cb.lower(root.get("academicYear")), pattern)
            );
            page = cardHistoryRepository.findAll(spec, pageable);
        } else {
            page = cardHistoryRepository.findAllByOrderByCreatedAtDesc(pageable);
        }

        List<CardHistoryDto> dtos = page.getContent().stream().map(this::toCardHistoryDto).toList();
        return PageResponse.of(page, dtos);
    }

    public CardHistoryDto toCardHistoryDto(CardHistory ch) {
        return CardHistoryDto.builder()
                .id(ch.getId())
                .devicePin(ch.getDevicePin())
                .cardNumber(ch.getCardNumber())
                .previousCardNumber(ch.getPreviousCardNumber())
                .academicYear(ch.getAcademicYear())
                .status(ch.getStatus())
                .issuedDate(ch.getIssuedDate())
                .expiryDate(ch.getExpiryDate())
                .replacedAt(ch.getReplacedAt())
                .notes(ch.getNotes())
                .employeeId(ch.getEmployee() != null ? ch.getEmployee().getId() : null)
                .employeeName(ch.getEmployee() != null ? ch.getEmployee().getEnglishName() : null)
                .studentId(ch.getStudent() != null ? ch.getStudent().getId() : null)
                .studentName(ch.getStudent() != null ? ch.getStudent().getEnglishName() : null)
                .createdAt(ch.getCreatedAt())
                .build();
    }

    @Transactional
    public void deleteDeviceUser(Long id) {
        deviceUserRepository.findById(id).ifPresent(u -> {
            try {
                terminalSyncService.deleteUserFromPhysicalMachinesAsync(u.getDevicePin());
            } catch (Exception ignored) {}
            deviceUserRepository.delete(u);
        });
    }

    @Transactional
    public int syncUsersFromTerminal(Long deviceId) {
        AttendanceDevice device = findDevice(deviceId);
        int synced = 0;
        boolean isAdms = "ADMS_PUSH".equalsIgnoreCase(device.getIntegrationType()) ||
                         "ADMS".equalsIgnoreCase(device.getIntegrationType());

        if (!isAdms && device.getIpAddress() != null) {
            List<RawDeviceUser> rawUsers = tcpClient.getDeviceUsers(device.getIpAddress(), device.getPort(), device.getCommKey());
            for (RawDeviceUser ru : rawUsers) {
                AttendanceDeviceUser user = deviceUserRepository.findByDeviceIdAndDevicePin(device.getId(), ru.getPin())
                        .orElseGet(() -> AttendanceDeviceUser.builder()
                                .device(device)
                                .devicePin(ru.getPin())
                                .build());

                user.setNameOnDevice(ru.getName());
                user.setPrivilege(ru.getPrivilege());
                if (ru.getCardNumber() != null && !ru.getCardNumber().isBlank()) {
                    user.setCardNumber(ru.getCardNumber());
                }
                user.setLastSyncedAt(Instant.now());
                user.setSyncStatus("SYNCED");

                // Auto-map to employee by employee code or PIN if match exists
                if (user.getEmployee() == null) {
                    employeeRepository.findByEmployeeCodeAndDeletedAtIsNull(ru.getPin()).ifPresent(user::setEmployee);
                }

                deviceUserRepository.save(user);
                synced++;
            }
        } else {
            // For ADMS terminals, queue QUERY USER command
            queueCommand(device, "DATA QUERY USERINFO");
        }
        return synced;
    }

    @Transactional
    public int syncUsersToDevice(Long targetDeviceId, Long sourceDeviceId) {
        AttendanceDevice targetDevice = findDevice(targetDeviceId);
        List<AttendanceDeviceUser> sourceUsers;

        if (sourceDeviceId != null) {
            sourceUsers = deviceUserRepository.findByDeviceId(sourceDeviceId);
        } else {
            sourceUsers = deviceUserRepository.findAll();
        }

        // If no existing device users, seed from all active employees
        if (sourceUsers.isEmpty()) {
            List<Employee> allEmployees = employeeRepository.findByDeletedAtIsNull();
            for (Employee emp : allEmployees) {
                AttendanceDeviceUser newUser = AttendanceDeviceUser.builder()
                        .device(targetDevice)
                        .devicePin(emp.getEmployeeCode())
                        .nameOnDevice(emp.getEnglishName())
                        .employee(emp)
                        .privilege("NORMAL_USER")
                        .faceEnrolled(false)
                        .fingerprintCount(0)
                        .syncStatus("SYNCED")
                        .lastSyncedAt(Instant.now())
                        .build();
                AttendanceDeviceUser saved = deviceUserRepository.save(newUser);
                queueUserToDevice(targetDevice, saved);
            }
            recordOperation(targetDevice, "SYNC_USERS_TO_DEVICE", "Count=" + allEmployees.size(), "SUCCESS", null);
            return allEmployees.size();
        }

        // Deduplicate by PIN to ensure clean sync to target machine
        Map<String, AttendanceDeviceUser> distinctUsersByPin = new LinkedHashMap<>();
        for (AttendanceDeviceUser u : sourceUsers) {
            if (!distinctUsersByPin.containsKey(u.getDevicePin())) {
                distinctUsersByPin.put(u.getDevicePin(), u);
            }
        }

        int count = 0;
        for (AttendanceDeviceUser src : distinctUsersByPin.values()) {
            AttendanceDeviceUser targetUser = deviceUserRepository
                    .findByDeviceIdAndDevicePin(targetDevice.getId(), src.getDevicePin())
                    .orElseGet(() -> AttendanceDeviceUser.builder()
                            .device(targetDevice)
                            .devicePin(src.getDevicePin())
                            .build());

            targetUser.setNameOnDevice(src.getNameOnDevice());
            targetUser.setEmployee(src.getEmployee());
            targetUser.setStudent(src.getStudent());
            targetUser.setPrivilege(src.getPrivilege());
            targetUser.setCardNumber(src.getCardNumber());
            targetUser.setPassword(src.getPassword());
            targetUser.setFaceEnrolled(src.isFaceEnrolled());
            targetUser.setFingerprintCount(src.getFingerprintCount());
            targetUser.setSyncStatus("SYNCED");
            targetUser.setLastSyncedAt(Instant.now());

            AttendanceDeviceUser saved = deviceUserRepository.save(targetUser);
            queueUserToDevice(targetDevice, saved);
            count++;
        }

        recordOperation(targetDevice, "SYNC_USERS_TO_DEVICE", "Count=" + count, "SUCCESS", null);
        return count;
    }

    @Transactional
    public int syncAllUsersAcrossAllDevices() {
        List<AttendanceDevice> allDevices = deviceRepository.findAll();
        int totalSynced = 0;
        for (AttendanceDevice d : allDevices) {
            if (d.isActive()) {
                totalSynced += syncUsersToDevice(d.getId(), null);
            }
        }
        return totalSynced;
    }

    private void queueUserToDevice(AttendanceDevice device, AttendanceDeviceUser user) {
        boolean isAdms = "ADMS_PUSH".equalsIgnoreCase(device.getIntegrationType()) ||
                         "ADMS".equalsIgnoreCase(device.getIntegrationType());

        if (isAdms) {
            // ZKTeco ADMS PUSH Command format:
            // DATA USER PIN=... \t Name=... \t Pri=... \t Passwd=... \t Card=... \t Grp=1 \t TZ=0
            int priCode = "ADMIN".equalsIgnoreCase(user.getPrivilege()) || "SUPER_ADMIN".equalsIgnoreCase(user.getPrivilege()) ? 14 : 0;
            String card = user.getCardNumber() != null ? user.getCardNumber() : "";
            String pwd = user.getPassword() != null ? user.getPassword() : "";
            String name = user.getNameOnDevice() != null ? user.getNameOnDevice() : user.getDevicePin();

            String cmd = String.format("DATA USER PIN=%s\tName=%s\tPri=%d\tPasswd=%s\tCard=%s\tGrp=1\tTZ=0",
                    user.getDevicePin(), name, priCode, pwd, card);
            queueCommand(device, cmd);
        } else if (device.getIpAddress() != null && !device.getIpAddress().isBlank()) {
            // Standalone TCP/IP Protocol - Direct synchronization to physical biometric terminal
            try {
                terminalSyncService.syncUserToPhysicalMachinesAsync(
                        user.getDevicePin(),
                        user.getNameOnDevice(),
                        user.getCardNumber(),
                        user.getPrivilege(),
                        user.getPassword(),
                        device.getIpAddress(),
                        device.getPort()
                );
            } catch (Exception ex) {
                log.warn("Could not dispatch user {} to {}: {}", user.getDevicePin(), device.getIpAddress(), ex.getMessage());
            }
        }
    }

    // Helper Methods
    private AttendanceDevice findDevice(Long id) {
        return deviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Device", "id", id));
    }

    private void recordOperation(AttendanceDevice device, String op, String params, String result, String error) {
        DeviceOperationLog logEntry = DeviceOperationLog.builder()
                .device(device)
                .operation(op)
                .parameters(params)
                .result(result)
                .errorMessage(error)
                .initiatedBy("SYSTEM")
                .build();
        operationLogRepository.save(logEntry);
    }

    private void queueCommand(AttendanceDevice device, String content) {
        DeviceCommand cmd = DeviceCommand.builder()
                .device(device)
                .commandContent(content)
                .status("PENDING")
                .build();
        commandRepository.save(cmd);
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

    private DeviceDto toDeviceDto(AttendanceDevice d) {
        return DeviceDto.builder()
                .id(d.getId())
                .name(d.getName())
                .serialNumber(d.getSerialNumber())
                .model(d.getModel())
                .ipAddress(d.getIpAddress())
                .port(d.getPort())
                .commKey(d.getCommKey())
                .integrationType(d.getIntegrationType())
                .location(d.getLocation())
                .branchId(d.getBranch() != null ? d.getBranch().getId() : null)
                .branchName(d.getBranch() != null ? d.getBranch().getName() : null)
                .departmentId(d.getDepartment() != null ? d.getDepartment().getId() : null)
                .departmentName(d.getDepartment() != null ? d.getDepartment().getName() : null)
                .description(d.getDescription())
                .connectionStatus(d.getConnectionStatus())
                .lastCommunication(d.getLastCommunication())
                .lastSync(d.getLastSync())
                .firmwareVersion(d.getFirmwareVersion())
                .active(d.isActive())
                .build();
    }

    private DeviceUserDto toDeviceUserDto(AttendanceDeviceUser u) {
        int historyCount = cardHistoryRepository.findByDevicePinOrderByCreatedAtDesc(u.getDevicePin()).size();
        return toDeviceUserDto(u, historyCount);
    }

    private DeviceUserDto toDeviceUserDto(AttendanceDeviceUser u, int historyCount) {
        String deptName = u.getEmployee() != null && u.getEmployee().getDepartment() != null
                ? u.getEmployee().getDepartment().getName() : null;
        String posTitle = u.getEmployee() != null && u.getEmployee().getPosition() != null
                ? u.getEmployee().getPosition().getTitle() : null;
        String grade = u.getStudent() != null ? u.getStudent().getGrade() : null;
        String className = u.getStudent() != null ? u.getStudent().getClassName() : null;

        String pType = "USER";
        if (u.getStudent() != null) {
            pType = "STUDENT";
        } else if (u.getEmployee() != null) {
            if ((u.getEmployee().getDepartment() != null && "Academic Affairs".equalsIgnoreCase(u.getEmployee().getDepartment().getName()))
                    || (u.getEmployee().getPosition() != null && "Lecturer / Instructor".equalsIgnoreCase(u.getEmployee().getPosition().getTitle()))) {
                pType = "TEACHER";
            } else {
                pType = "STAFF";
            }
        }

        String status = u.getStatus() != null ? u.getStatus() : "ACTIVE";
        if (u.getStudent() != null && "WITHDRAWN".equalsIgnoreCase(u.getStudent().getStatus())) {
            status = "INACTIVE";
        } else if (u.getEmployee() != null && ("TERMINATED".equalsIgnoreCase(u.getEmployee().getEmploymentStatus())
                || "RESIGNED".equalsIgnoreCase(u.getEmployee().getEmploymentStatus()))) {
            status = "INACTIVE";
        }

        return DeviceUserDto.builder()
                .id(u.getId())
                .deviceId(u.getDevice().getId())
                .deviceName(u.getDevice().getName())
                .deviceSerialNumber(u.getDevice().getSerialNumber())
                .devicePin(u.getDevicePin())
                .employeeId(u.getEmployee() != null ? u.getEmployee().getId() : null)
                .employeeCode(u.getEmployee() != null ? u.getEmployee().getEmployeeCode() : null)
                .employeeName(u.getEmployee() != null ? u.getEmployee().getEnglishName() : null)
                .studentId(u.getStudent() != null ? u.getStudent().getId() : null)
                .studentCode(u.getStudent() != null ? u.getStudent().getStudentCode() : null)
                .studentName(u.getStudent() != null ? u.getStudent().getEnglishName() : null)
                .studentGrade(grade)
                .studentClassName(className)
                .departmentName(deptName)
                .positionTitle(posTitle)
                .personnelType(pType)
                .nameOnDevice(u.getNameOnDevice())
                .privilege(u.getPrivilege())
                .cardNumber(u.getCardNumber())
                .cardHistoryCount(historyCount)
                .faceEnrolled(u.isFaceEnrolled())
                .fingerprintCount(u.getFingerprintCount())
                .syncStatus(u.getSyncStatus())
                .status(status)
                .lastSyncedAt(u.getLastSyncedAt())
                .build();
    }
}
