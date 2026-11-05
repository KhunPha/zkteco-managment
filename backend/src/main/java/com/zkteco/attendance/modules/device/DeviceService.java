package com.zkteco.attendance.modules.device;

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
import com.zkteco.attendance.modules.personnel.EmployeeRepository;
import com.zkteco.attendance.modules.personnel.StudentRepository;
import com.zkteco.attendance.modules.zkteco.DeviceInfo;
import com.zkteco.attendance.modules.zkteco.RawAttendanceRecord;
import com.zkteco.attendance.modules.zkteco.RawDeviceUser;
import com.zkteco.attendance.modules.zkteco.ZKTecoTcpClient;
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
import java.util.ArrayList;
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
        boolean isAdms = "ADMS_PUSH".equalsIgnoreCase(device.getIntegrationType()) ||
                         "ADMS".equalsIgnoreCase(device.getIntegrationType());

        if (isAdms) {
            // 1. For ADMS Push: check recent heartbeat communication (within last 10 minutes)
            if (device.getLastCommunication() != null &&
                    device.getLastCommunication().isAfter(Instant.now().minusSeconds(600))) {
                reachable = true;
            }
            // 2. Built-in simulator responds as online
            else if (device.getSerialNumber() != null && device.getSerialNumber().startsWith("ZK-SIM")) {
                reachable = true;
            }
            // 3. Fallback: try socket probe if an IP is configured
            else if (device.getIpAddress() != null && !device.getIpAddress().isBlank()) {
                reachable = tcpClient.testConnection(device.getIpAddress(), device.getPort(), device.getCommKey());
            }
        } else {
            // TCP_PULL protocol
            if (device.getIpAddress() != null && !device.getIpAddress().isBlank()) {
                reachable = tcpClient.testConnection(device.getIpAddress(), device.getPort(), device.getCommKey());
            } else if (device.getSerialNumber() != null && device.getSerialNumber().startsWith("ZK-SIM")) {
                reachable = true;
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
    public boolean syncTime(Long id) {
        AttendanceDevice device = findDevice(id);
        boolean success = false;
        boolean isAdms = "ADMS_PUSH".equalsIgnoreCase(device.getIntegrationType()) ||
                         "ADMS".equalsIgnoreCase(device.getIntegrationType());

        if (isAdms) {
            // For ADMS push, queue SET TIME command
            queueCommand(device, "SET TIME " + TimeUtils.formatPhnomPenh(Instant.now()));
            device.setLastCommunication(Instant.now());
            deviceRepository.save(device);
            success = true;
        } else {
            success = tcpClient.syncDeviceTime(device.getIpAddress(), device.getPort(), device.getCommKey(), Instant.now());
            if (success) {
                device.setLastCommunication(Instant.now());
                deviceRepository.save(device);
            }
        }

        recordOperation(device, "SYNC_TIME", "TargetTime=" + Instant.now(), success ? "SUCCESS" : "FAILED", null);
        return success;
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
        AttendanceDevice device = findDevice(id);
        boolean success = false;
        boolean isAdms = "ADMS_PUSH".equalsIgnoreCase(device.getIntegrationType()) ||
                         "ADMS".equalsIgnoreCase(device.getIntegrationType());

        if (isAdms) {
            queueCommand(device, "REBOOT");
            success = true;
        } else {
            success = tcpClient.restartDevice(device.getIpAddress(), device.getPort(), device.getCommKey());
        }

        recordOperation(device, "RESTART", "Reboot trigger", success ? "SUCCESS" : "FAILED", null);
        return success;
    }

    // Device Users
    @Transactional(readOnly = true)
    public PageResponse<DeviceUserDto> getDeviceUsers(Long deviceId, String search, Pageable pageable) {
        Specification<AttendanceDeviceUser> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (deviceId != null) {
                predicates.add(cb.equal(root.get("device").get("id"), deviceId));
            }
            if (search != null && !search.trim().isEmpty()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("devicePin")), pattern),
                        cb.like(cb.lower(root.get("nameOnDevice")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<AttendanceDeviceUser> page = deviceUserRepository.findAll(spec, pageable);
        List<DeviceUserDto> dtos = page.getContent().stream().map(this::toDeviceUserDto).collect(Collectors.toList());
        return PageResponse.of(page, dtos);
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
        if (request.getCardNumber() != null) devUser.setCardNumber(request.getCardNumber());
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
                    if (request.getCardNumber() != null) sib.setCardNumber(request.getCardNumber());
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
        if (cardNumber != null) devUser.setCardNumber(cardNumber);
        devUser.setLastSyncedAt(Instant.now());

        AttendanceDeviceUser saved = deviceUserRepository.save(devUser);
        queueUserToDevice(saved.getDevice(), saved);

        if (saved.getEmployee() != null) {
            List<AttendanceDeviceUser> siblings = deviceUserRepository.findByEmployeeId(saved.getEmployee().getId());
            for (AttendanceDeviceUser sib : siblings) {
                if (!sib.getId().equals(saved.getId())) {
                    if (cardNumber != null) sib.setCardNumber(cardNumber);
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

    @Transactional
    public void deleteDeviceUser(Long id) {
        deviceUserRepository.deleteById(id);
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
            // Standalone TCP/IP Protocol
            try {
                tcpClient.setUserInfo(device.getIpAddress(), device.getPort(), device.getCommKey(),
                        user.getDevicePin(), user.getNameOnDevice(), user.getPassword(), user.getPrivilege(), user.getCardNumber());
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
                .nameOnDevice(u.getNameOnDevice())
                .privilege(u.getPrivilege())
                .cardNumber(u.getCardNumber())
                .faceEnrolled(u.isFaceEnrolled())
                .fingerprintCount(u.getFingerprintCount())
                .syncStatus(u.getSyncStatus())
                .lastSyncedAt(u.getLastSyncedAt())
                .build();
    }
}
