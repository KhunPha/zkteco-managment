package com.zkteco.attendance.modules.device;

import com.zkteco.attendance.modules.personnel.Employee;
import com.zkteco.attendance.modules.personnel.Student;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class TerminalSyncService {

    private final DeviceRepository deviceRepository;
    private final DeviceUserRepository deviceUserRepository;
    private final com.zkteco.attendance.modules.zkteco.ZKTecoTcpClient tcpClient;

    /**
     * Synchronize employee to all active biometric terminals.
     * Creates or updates the AttendanceDeviceUser records in PostgreSQL and pushes to physical machines.
     */
    @Transactional
    public void syncEmployee(Employee emp, String cardNumber) {
        if (emp == null || emp.getEmployeeCode() == null) return;

        List<AttendanceDevice> activeDevices = deviceRepository.findAll().stream()
                .filter(AttendanceDevice::isActive)
                .toList();

        for (AttendanceDevice device : activeDevices) {
            AttendanceDeviceUser devUser = deviceUserRepository
                    .findByDeviceIdAndDevicePin(device.getId(), emp.getEmployeeCode())
                    .orElseGet(() -> AttendanceDeviceUser.builder()
                            .device(device)
                            .devicePin(emp.getEmployeeCode())
                            .build());

            devUser.setEmployee(emp);
            devUser.setNameOnDevice(emp.getEnglishName());
            if (cardNumber != null && !cardNumber.isBlank()) {
                devUser.setCardNumber(cardNumber.trim());
            }
            devUser.setPrivilege("NORMAL_USER");
            devUser.setSyncStatus("SYNCED");
            devUser.setStatus(emp.getEmploymentStatus() != null ? emp.getEmploymentStatus() : "ACTIVE");
            devUser.setLastSyncedAt(Instant.now());
            deviceUserRepository.save(devUser);
        }

        // Asynchronously dispatch to physical terminals
        syncUserToPhysicalMachinesAsync(
                emp.getEmployeeCode(),
                emp.getEnglishName(),
                cardNumber,
                "NORMAL_USER",
                ""
        );
    }

    /**
     * Synchronize student to all active biometric terminals.
     * Creates or updates the AttendanceDeviceUser records in PostgreSQL and pushes to physical machines.
     */
    @Transactional
    public void syncStudent(Student student, String cardNumber) {
        if (student == null || student.getStudentCode() == null) return;

        List<AttendanceDevice> activeDevices = deviceRepository.findAll().stream()
                .filter(AttendanceDevice::isActive)
                .toList();

        for (AttendanceDevice device : activeDevices) {
            AttendanceDeviceUser devUser = deviceUserRepository
                    .findByDeviceIdAndDevicePin(device.getId(), student.getStudentCode())
                    .orElseGet(() -> AttendanceDeviceUser.builder()
                            .device(device)
                            .devicePin(student.getStudentCode())
                            .build());

            devUser.setStudent(student);
            devUser.setNameOnDevice(student.getEnglishName());
            if (cardNumber != null && !cardNumber.isBlank()) {
                devUser.setCardNumber(cardNumber.trim());
            }
            devUser.setPrivilege("NORMAL_USER");
            devUser.setSyncStatus("SYNCED");
            devUser.setStatus(student.getStatus() != null ? student.getStatus() : "ACTIVE");
            devUser.setLastSyncedAt(Instant.now());
            deviceUserRepository.save(devUser);
        }

        // Asynchronously dispatch to physical terminals
        syncUserToPhysicalMachinesAsync(
                student.getStudentCode(),
                student.getEnglishName(),
                cardNumber,
                "NORMAL_USER",
                ""
        );
    }

    /**
     * Synchronize a specific AttendanceDeviceUser record to terminal.
     */
    public void syncDeviceUser(AttendanceDeviceUser devUser) {
        if (devUser == null || devUser.getDevicePin() == null) return;
        String ip = devUser.getDevice() != null ? devUser.getDevice().getIpAddress() : null;
        Integer port = devUser.getDevice() != null ? devUser.getDevice().getPort() : 4370;

        syncUserToPhysicalMachinesAsync(
                devUser.getDevicePin(),
                devUser.getNameOnDevice(),
                devUser.getCardNumber(),
                devUser.getPrivilege(),
                devUser.getPassword(),
                ip,
                port
        );
    }

    public CompletableFuture<Boolean> syncUserToPhysicalMachinesAsync(
            String pin, String name, String card, String privilege, String password) {
        return syncUserToPhysicalMachinesAsync(pin, name, card, privilege, password, null, null);
    }

    public CompletableFuture<Boolean> syncUserToPhysicalMachinesAsync(
            String pin, String name, String card, String privilege, String password, String ip, Integer port) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return executeSyncScript("sync", pin, name, card, privilege, password, ip, port);
            } catch (Exception e) {
                log.error("Failed to execute terminal sync for PIN {}: {}", pin, e.getMessage());
                return false;
            }
        });
    }

    public CompletableFuture<Boolean> deleteUserFromPhysicalMachinesAsync(String pin) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return executeSyncScript("delete", pin, "", "", "NORMAL_USER", "", null, null);
            } catch (Exception e) {
                log.error("Failed to delete user {} from terminals: {}", pin, e.getMessage());
                return false;
            }
        });
    }

    private boolean executeSyncScript(String action, String pin, String name, String card, String privilege, String password, String ip, Integer port) {
        try {
            if ("delete".equalsIgnoreCase(action)) {
                if (ip != null && !ip.isBlank()) {
                    return tcpClient.deleteUser(ip, port != null ? port : 4370, null, pin);
                }
                List<AttendanceDevice> activeDevices = deviceRepository.findAll().stream()
                        .filter(AttendanceDevice::isActive)
                        .toList();
                boolean allOk = true;
                for (AttendanceDevice d : activeDevices) {
                    if (d.getIpAddress() != null && !d.getIpAddress().isBlank()) {
                        boolean ok = tcpClient.deleteUser(d.getIpAddress(), d.getPort(), d.getCommKey(), pin);
                        if (!ok) allOk = false;
                    }
                }
                return allOk;
            } else {
                if (ip != null && !ip.isBlank()) {
                    return tcpClient.setUserInfo(ip, port != null ? port : 4370, null, pin, name, password, privilege, card);
                }
                List<AttendanceDevice> activeDevices = deviceRepository.findAll().stream()
                        .filter(AttendanceDevice::isActive)
                        .toList();
                boolean allOk = true;
                for (AttendanceDevice d : activeDevices) {
                    if (d.getIpAddress() != null && !d.getIpAddress().isBlank()) {
                        boolean ok = tcpClient.setUserInfo(d.getIpAddress(), d.getPort(), d.getCommKey(), pin, name, password, privilege, card);
                        if (!ok) allOk = false;
                    }
                }
                return allOk;
            }
        } catch (Exception ex) {
            log.error("Native terminal sync operation failed for PIN {}: {}", pin, ex.getMessage());
            return false;
        }
    }
}

