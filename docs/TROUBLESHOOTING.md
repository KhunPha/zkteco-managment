# Troubleshooting Guide: Enterprise ZKTeco Biometric Attendance Platform

This guide outlines diagnostic procedures, error codes, and resolution steps for common issues encountered during terminal integration, network communication, attendance calculation, and database operations.

---

## 1. Diagnostic Flowchart

```
                          [ Issue Reported ]
                                  |
                +-----------------+-----------------+
                |                                   |
       [ Device Integration ]             [ System / Calculation ]
                |                                   |
        Terminal Protocol?                 Expected Data Missing?
        /                \                 /                     \
    TCP Socket           ADMS Push      Raw Logs OK?          Shift Assigned?
     (Port 4370)       (/iclock/cdata)   |                     |
        |                     |         Check Recalc Engine   Check Schedules
  Verify IP & Ping      Verify Cloud    (Admin Trigger)       Table
  & Comm Key            Server IP in UI
```

---

## 2. ZKTeco Device Connectivity Troubleshooting

### 2.1. Standalone Terminal Offline (TCP Port 4370)

**Symptoms**:
- Clicking **"Test Connection"** in the web UI returns `"DEVICE_OFFLINE"`.
- Backend logs display `SocketTimeoutException: Connect timed out to 192.168.1.201:4370`.

**Root Causes & Solutions**:
1. **Network Routing / Firewall Blocking Port 4370**:
   - Verify network path from backend host to terminal:
     ```bash
     # Linux
     nc -zv 192.168.1.201 4370
     # Windows PowerShell
     Test-NetConnection -ComputerName 192.168.1.201 -Port 4370
     ```
   - If blocked, adjust iptables or network switch ACLs to permit port 4370 between application server and device VLAN.
2. **Incorrect Communication Key (`Comm Key`)**:
   - Check device menu: `System -> Comm. Settings -> Comm Key`.
   - If set to a number (e.g., `1234`), the same key must be configured in the device record in the admin portal. If left at `0` (default), leave the password field empty.
3. **IP Address Conflict**:
   - Check whether another host on the subnet claimed the terminal's IP address. Ensure static DHCP reservation for all biometric hardware terminals.

---

### 2.2. ADMS Push Terminal Not Uploading Attendance

**Symptoms**:
- Employees punch successfully on physical terminal, but records do not appear in **Raw Logs**.
- Device "Last Communication" timestamp in Web UI is outdated.

**Root Causes & Solutions**:
1. **Incorrect Cloud Server Settings on Terminal**:
   - On the terminal physical menu:
     - Navigate to `Comm. -> Cloud Server Settings` (or `ADMS Settings` on older firmware).
     - **Server Address**: Must point to the backend IP or domain (e.g., `192.168.1.100` or `attendance.domain.com`).
     - **Server Port**: `8080` (or `80` / `443` if behind Nginx).
     - **Enable Domain Name**: Turn `ON` if using a domain; `OFF` if using direct IP.
     - **Proxy Server**: Ensure proxy is disabled unless mandatory on the local network.
2. **Nginx Reverse Proxy Buffering**:
   - ZKTeco ADMS expects unbuffered HTTP streaming. Ensure `proxy_buffering off;` is configured in `/etc/nginx/conf.d/zkteco.conf` for the `/iclock/` location block.
3. **Device Serial Number Mismatch**:
   - Verify the serial number printed on the hardware barcode matches **exactly** with the `serial_number` stored in the system database.

---

### 2.3. Terminal Clock Drift & Wrong Timestamps

**Symptoms**:
- Punches from the terminal are logged hours ahead or behind server time.

**Solutions**:
1. Navigate to **Device Management** in the Web UI and click **"Sync Time"**.
2. Verify timezone on the terminal:
   - For Cambodia / Indochina: Timezone offset must be **UTC+07:00**.
   - Check menu: `System -> Date/Time -> Daylight Saving Time` is set to `OFF`.
3. If the terminal loses time after a reboot, the internal CMOS coin cell battery (CR2032) is depleted and must be replaced.

---

## 3. Attendance Calculation Engine Issues

### 3.1. Employees Displayed as "ABSENT" Despite Punching

**Verification Steps**:
1. Check **Attendance -> Raw Logs**: Verify raw punch logs exist for the target employee ID and date.
2. If raw logs exist:
   - Verify **Shift Schedule**: Confirm the employee has an active `EmployeeSchedule` assigned for that day of the week.
   - If no schedule is assigned, the engine cannot match punches against shift boundaries. Navigate to **Schedules** and assign a weekly roster.
3. Once the schedule is assigned, navigate to **Attendance -> Daily** and click **"Recalculate Attendance"** to trigger recalculation for that date range.

---

### 3.2. Unmatched Device Users (Punches Recorded with `employee_id = null`)

**Symptoms**:
- Raw logs appear with `device_user_id = "1045"`, but the employee name is blank.

**Resolution**:
1. The terminal user PIN has not yet been mapped to an HR employee profile.
2. Navigate to **Device Users** in the administrative sidebar.
3. Filter by **"Unmapped Users"**.
4. Click **"Map to Employee"** and select the corresponding employee from the dropdown.
5. Trigger **"Recalculate Attendance"**; all previous unmapped punches will retroactively link to the employee record.

---

## 4. Database & Flyway Migration Issues

### 4.1. Flyway Migration Checksum Failure

**Error**:
```
FlywayException: Validate failed: Migrations have failed validation
Version V3__device_schema.sql has changed
```

**Resolution**:
Do not edit already-applied migration files. If in development:
```bash
# In PostgreSQL terminal
DELETE FROM flyway_schema_history WHERE version = '3';
# Or repair checksums:
mvn flyway:repair
```

### 4.2. Connection Pool Exhaustion (HikariCP)

**Error**:
```
Connection is not available, request timed out after 30000ms.
```

**Resolution**:
Adjust PostgreSQL max connections and Spring Hikari pool sizing in `application-prod.yml`:
```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 30
      minimum-idle: 10
      idle-timeout: 30000
      connection-timeout: 20000
```
In `postgresql.conf`, ensure `max_connections = 100` or higher.

