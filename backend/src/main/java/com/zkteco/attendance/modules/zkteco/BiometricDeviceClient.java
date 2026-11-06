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

    /**
     * Test physical speaker / voice prompt.
     */
    boolean testVoice(String ipAddress, int port, String commKey, int voiceIndex);

    /**
     * Power off terminal remotely.
     */
    boolean powerOffDevice(String ipAddress, int port, String commKey);

    /**
     * Enable or disable terminal screen and keypad.
     */
    boolean enableDevice(String ipAddress, int port, String commKey);
    boolean disableDevice(String ipAddress, int port, String commKey);

    /**
     * Trigger door access relay.
     */
    boolean unlockDoor(String ipAddress, int port, String commKey, int seconds);

    /**
     * Delete user from terminal.
     */
    boolean deleteUser(String ipAddress, int port, String commKey, String pin);

    /**
     * Clear stored attendance logs buffer on terminal.
     */
    boolean clearAttendanceLogs(String ipAddress, int port, String commKey);

    /**
     * Read menu parameters from terminal.
     */
    java.util.Map<String, String> getMenuParameters(String ipAddress, int port, String commKey);

    /**
     * Set menu parameters on terminal.
     */
    boolean setMenuParameters(String ipAddress, int port, String commKey, java.util.Map<String, String> params);

    /**
     * Clear administrator lock privileges.
     */
    boolean clearAdmin(String ipAddress, int port, String commKey);
}

