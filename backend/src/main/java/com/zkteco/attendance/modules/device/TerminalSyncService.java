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
            String pythonBin = "/home/sophaederson/zkteco-in01a/venv/bin/python3";
            if (!new File(pythonBin).exists()) {
                pythonBin = "python3";
            }

            File scriptFile = new File("scripts/sync_user_to_device.py");
            if (!scriptFile.exists()) {
                scriptFile = new File("/home/sophaederson/Desktop/Programming/Project/zkteco-managment/scripts/sync_user_to_device.py");
            }

            List<String> cmd = new ArrayList<>(List.of(
                    pythonBin,
                    scriptFile.getAbsolutePath(),
                    "--action", action,
                    "--pin", pin != null ? pin.trim() : "",
                    "--name", name != null ? name.trim() : "",
                    "--card", card != null ? card.trim() : "0",
                    "--privilege", privilege != null ? privilege.trim() : "NORMAL_USER",
                    "--password", password != null ? password.trim() : ""
            ));

            if (ip != null && !ip.isBlank()) {
                cmd.add("--ip");
                cmd.add(ip.trim());
                if (port != null) {
                    cmd.add("--port");
                    cmd.add(String.valueOf(port));
                }
            }

            log.info("Executing terminal sync command: {}", String.join(" ", cmd));
            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }

            int exitCode = process.waitFor();
            log.info("Terminal sync execution result (code {}): {}", exitCode, output.toString().trim());
            return exitCode == 0;
        } catch (Exception ex) {
            log.error("Error invoking sync_user_to_device.py: {}", ex.getMessage());
            return false;
        }
    }
}

