package com.zkteco.attendance.modules.zkteco;

import java.time.Instant;
import java.util.List;

public interface BiometricDeviceClient {

    /**
     * Test connection to device.
     */
    boolean testConnection(String ipAddress, int port, String commKey);

    /**
     * Retrieve device diagnostic and hardware info.
     */
    DeviceInfo getDeviceInfo(String ipAddress, int port, String commKey);

    /**
     * Read current device clock.
     */
    Instant getDeviceTime(String ipAddress, int port, String commKey);

    /**
     * Synchronize device time with server clock.
     */
    boolean syncDeviceTime(String ipAddress, int port, String commKey, Instant targetTime);

    /**
     * Read attendance records incrementally or fully from terminal.
     */
    List<RawAttendanceRecord> getAttendanceRecords(String ipAddress, int port, String commKey, String serialNumber);

    /**
     * Read users currently registered on terminal.
     */
    List<RawDeviceUser> getDeviceUsers(String ipAddress, int port, String commKey);

    /**
     * Upload or update user record on terminal.
     */
    boolean setUserInfo(String ipAddress, int port, String commKey,
                        String pin, String name, String password, String privilege, String cardNumber);

    /**
     * Restart device remotely (if supported by firmware).
     */
    boolean restartDevice(String ipAddress, int port, String commKey);
}

