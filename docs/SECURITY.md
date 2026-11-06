# Security & Compliance Architecture: Enterprise ZKTeco Attendance Platform

This document describes the security policies, cryptography, network hardening, biometric data privacy practices, and role-based access control (RBAC) implemented in this platform.

---

## 1. Authentication & Token Management

The system implements a stateless, cryptographically signed JSON Web Token (JWT) architecture combined with stateful, rotating, hashed refresh tokens.

```
+------------+               +-----------------------+               +-------------------+
|  Browser / |  1. /login    |   Spring Security     |  2. Validate  |   Database        |
|  API Client+-------------->+ JwtAuthenticationFilter+------------->+ (BCrypt Password) |
+------------+               +-----------+-----------+               +---------+---------+
      ^                                  |                                     |
      | 3. Access Token (HS512, 24h)     | 4. Refresh Token Hash (SHA-256)     |
      |    Refresh Token (Random UUID)   +------------------------------------>+
      +----------------------------------+
```

### 1.1. JWT Access Tokens
- **Algorithm**: HMAC-SHA-512 (`HS512`) with minimum 64-byte secret key.
- **Payload**: Contains `sub` (username), `userId`, `roles`, and `permissions`.
- **Lifespan**: Short-lived (default 24 hours, configurable via `app.jwt.access-token-expiration-ms`).

### 1.2. Hashed Refresh Tokens & Token Rotation
- Plaintext refresh tokens are **never stored** in the database.
- Upon token issuance, the raw token is hashed using **SHA-256** and saved in `refresh_tokens` alongside client metadata:
  - `ip_address`
  - `user_agent`
  - `expires_at`
  - `revoked` flag
- **Reuse Detection**: When `/api/v1/auth/refresh` is called, the old refresh token is invalidated immediately, and a new refresh token is issued. If a previously invalidated refresh token is presented, the system detects a potential token theft and revokes all active sessions for that user account.

### 1.3. Password Security
- Passwords are encrypted using **BCrypt** with an adaptive work factor of 12 (or Argon2id in high-security profiles).
- Enforced password policy: minimum 8 characters, at least one uppercase letter, one lowercase letter, one numeric digit, and one special symbol.

---

## 2. Biometric Data Privacy & Compliance

Biometric identifiers (fingerprints, facial geometry vectors, iris data) are classified as **Sensitive Personal Identifiable Information (PII)** under international privacy standards (GDPR Art. 9, ISO/IEC 27701).

### 2.1. Principle of Data Minimization
- **No Raw Biometrics on Server**: The backend database **never** stores raw biometric imagery, photographs, or raw minutiae templates during normal attendance operations.
- **Local Terminal Matching**: Biometric verification happens entirely on-device (1:N or 1:1 on the ZKTeco hardware).
- **Log Transmission**: The terminal transmits only the resulting punch event:
  - `device_user_id` (PIN)
  - `punch_time` (UTC timestamp)
  - `verify_type` (Enum: FINGERPRINT, FACE, PASSWORD, CARD)
  - `punch_state` (Enum: CHECK_IN, CHECK_OUT, BREAK_OUT, BREAK_IN)

### 2.2. Isolated User ID Mapping
The database decouples physical terminal PIN numbers from personal records:
```
[ attendance_devices ]
          |
          v
[ attendance_device_users ]  <-- (Stores device_user_id: "1001", active_status)
          |
          v
    [ employees ]             <-- (Stores legal name, department, payroll code)
```
If a terminal is physically stolen or compromised, no personal identity records are exposed on the device filesystem.

---

## 3. Network Isolation & Hardware Hardening

Physical biometric terminals are embedded IoT devices running Linux or RTOS firmware. They must be isolated from standard user workstations.

### 3.1. Dedicated Biometric VLAN
- Biometric terminals must be connected to a dedicated **VLAN** (e.g., `192.168.100.0/24`).
- **Firewall Rules**:
  - Inbound traffic to terminals: Only the Spring Boot application server is permitted to initiate connections on TCP port `4370`.
  - Outbound traffic from terminals: Only destination port `8484` (or `80` / `443` via Nginx) on the application server is allowed. No direct internet access.

### 3.2. Device Communication Keys
- All terminals must have a non-default **Communication Key** (`Comm Key`) configured in device hardware settings.
- Requests over TCP port `4370` must provide this key to prevent unauthorized terminal polling by rogue network hosts.

---

## 4. Role-Based Access Control (RBAC) Matrix

Permissions are enforced at the API controller layer using Spring Security `@PreAuthorize("hasAuthority('...')")`.

| Permission / Function | SUPER_ADMIN | HR_ADMIN | DEPT_MANAGER | AUDITOR | EMPLOYEE |
|---|:---:|:---:|:---:|:---:|:---:|
| **Manage Users & Roles** | Yes | No | No | No | No |
| **Manage Devices (Add/Sync/Reboot)** | Yes | Yes | No | No | No |
| **Manage Employee Profiles** | Yes | Yes | Read Only | Read Only | No |
| **Process / Recalculate Attendance**| Yes | Yes | No | No | No |
| **Approve Attendance Corrections** | Yes | Yes | Yes (Dept) | No | No |
| **Approve Leave Applications** | Yes | Yes | Yes (Dept) | No | No |
| **Export Reports (PDF/Excel/CSV)** | Yes | Yes | Yes (Dept) | Yes | Self Only |
| **View Immutable Audit Logs** | Yes | No | No | Yes | No |

---

## 5. Audit Logging & Forensic Traceability

Every administrative mutation, device command, attendance correction, and security event is recorded in the `audit_logs` table:

- **Entity**: `AuditLog`
- **Tracked Attributes**:
  - `user_id` & `username`
  - `action` (e.g., `DEVICE_REBOOT`, `ATTENDANCE_CORRECTION_APPROVED`, `USER_LOGIN`)
  - `entity_name` & `entity_id`
  - `ip_address` & `user_agent`
  - `old_value` & `new_value` (JSON diff)
  - `timestamp` (UTC)
- Audit log records are append-only. The database schema strictly prohibits `UPDATE` or `DELETE` operations on this table.

