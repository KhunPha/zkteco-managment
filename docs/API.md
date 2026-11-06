# REST API Specification: Enterprise ZKTeco Biometric Attendance Platform

## 1. Overview & Conventions

The platform exposes a standard RESTful API adhering to RFC 7807 problem details and predictable JSON response structures.

- **Base URL**: `http://<server-ip>:8484/api/v1` (or via reverse proxy `http://<domain>/api/v1`)
- **ADMS Server Base URL**: `http://<server-ip>:8484/iclock` (or via reverse proxy `http://<server-ip>/iclock`)
- **Timezone**: All timestamps in requests and responses are ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ssZ`). Calculated local representations adhere to `Asia/Phnom_Penh` (UTC+07:00).
- **Authentication**: Bearer JWT tokens sent via standard HTTP header `Authorization: Bearer <access_token>`.

---

## 2. Standard Response Envelope

### Standard Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2026-11-04T12:00:00Z"
}
```

### Standard Paginated Response
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "content": [ ... ],
    "page": 0,
    "size": 20,
    "totalElements": 150,
    "totalPages": 8,
    "first": true,
    "last": false
  },
  "timestamp": "2026-11-04T12:00:00Z"
}
```

### Standard Error Response
```json
{
  "success": false,
  "errorCode": "RESOURCE_NOT_FOUND",
  "message": "Employee not found with id: 42",
  "details": [
    {
      "field": "employeeId",
      "issue": "Must exist in database"
    }
  ],
  "timestamp": "2026-11-04T12:00:00Z"
}
```

---

## 3. Authentication & User Management

### 3.1. Login
- **Endpoint**: `POST /api/v1/auth/login`
- **Request Body**:
```json
{
  "username": "admin",
  "password": "Admin@123456"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzUxMiJ9...",
    "refreshToken": "4a7b9c...",
    "tokenType": "Bearer",
    "expiresIn": 86400,
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@zkteco-system.local",
      "roles": ["SUPER_ADMIN"],
      "permissions": ["*"]
    }
  }
}
```

### 3.2. Refresh Access Token
- **Endpoint**: `POST /api/v1/auth/refresh`
- **Request Body**:
```json
{
  "refreshToken": "4a7b9c..."
}
```
- **Response**: Returns a new `accessToken` and a rotated `refreshToken`.

### 3.3. Logout
- **Endpoint**: `POST /api/v1/auth/logout`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK` (Invalidates refresh token).

### 3.4. Current User Profile
- **Endpoint**: `GET /api/v1/auth/me`
- **Headers**: `Authorization: Bearer <token>`

---

## 4. ZKTeco Device Management

### 4.1. List Devices
- **Endpoint**: `GET /api/v1/devices?page=0&size=20&search=Lobby`
- **Response**: Paginated list of registered biometric terminals.

### 4.2. Register Device
- **Endpoint**: `POST /api/v1/devices`
- **Request Body**:
```json
{
  "name": "Main Building Lobby Terminal",
  "serialNumber": "ZK-TERMINAL-01",
  "ipAddress": "192.168.1.201",
  "port": 4370,
  "communicationType": "TCP_IP",
  "branchId": 1,
  "location": "Ground Floor Entrance",
  "enabled": true
}
```

### 4.3. Test Device Connection (TCP/IP Ping)
- **Endpoint**: `POST /api/v1/devices/{id}/test-connection`
- **Response**:
```json
{
  "success": true,
  "message": "Device is online and responsive",
  "data": {
    "online": true,
    "responseTimeMs": 14,
    "serialNumber": "ZK-TERMINAL-01",
    "firmwareVersion": "Ver 8.0.4.4-20220610"
  }
}
```

### 4.4. Synchronize Device Hardware Clock
- **Endpoint**: `POST /api/v1/devices/{id}/sync-time`
- **Response**: Sets the hardware RTC to match server time (`Asia/Phnom_Penh`).

### 4.5. Trigger Manual Log Download (TCP/IP Pull)
- **Endpoint**: `POST /api/v1/devices/{id}/pull-logs`
- **Response**:
```json
{
  "success": true,
  "message": "Attendance log pull complete",
  "data": {
    "downloadedRecords": 142,
    "newRecordsSaved": 8,
    "duplicatesIgnored": 134
  }
}
```

### 4.6. Reboot Device
- **Endpoint**: `POST /api/v1/devices/{id}/reboot`
- **Response**: Queues a restart command via TCP socket or ADMS push command queue.

---

## 5. ZKTeco ADMS Push Protocol Endpoints (Hardware facing)

These endpoints implement the proprietary ZKTeco Push/ADMS protocol used by iClock, SilkBio, MB, and uFace devices over HTTP.

### 5.1. Handshake & Initialization
- **Endpoint**: `GET /iclock/cdata?SN={serialNumber}&pushver=2.4.1`
- **Response Format**: `text/plain`
```text
GET OPTION FROM: {serialNumber}
Stamp=20261104120000
OpStamp=0
PhotoStamp=0
ErrorDelay=60
Delay=30
TransFlag=TransData AttLog OpLog
TimeZone=7
Realtime=1
Encrypt=0
```

### 5.2. Attendance Log Ingestion (Push)
- **Endpoint**: `POST /iclock/cdata?SN={serialNumber}&table=ATTLOG`
- **Payload Format**: Tab-delimited plain text string from hardware:
```text
1001	2026-11-04 07:58:12	0	1	0	0
1002	2026-11-04 08:02:44	0	15	0	0
```
*(Columns: PIN, Timestamp YYYY-MM-DD HH:mm:ss, Verify Type, Punch State, WorkCode, Reserved)*
- **Response Format**: `text/plain`
```text
OK: 2
```

### 5.3. Command Queue Polling
- **Endpoint**: `GET /iclock/getrequest?SN={serialNumber}`
- **Response Format**: `text/plain`
```text
C:101:CHECK
C:102:SET_TIME 2026-11-04 12:00:00
```
*(If no commands pending, responds with `OK`)*

### 5.4. Command Status Callback
- **Endpoint**: `POST /iclock/devicecmd?SN={serialNumber}`
- **Payload Format**: `ID=101&Return=0&CMD=CHECK`
- **Response Format**: `text/plain`
```text
OK
```

---

## 6. Attendance & Processing Engine

### 6.1. Daily Attendance Report & Monitoring
- **Endpoint**: `GET /api/v1/attendance/daily?date=2026-11-04&branchId=1&departmentId=2`
- **Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1052,
      "employeeId": 12,
      "employeeCode": "EMP-0012",
      "employeeName": "Sopha Chem",
      "department": "Software Engineering",
      "date": "2026-11-04",
      "shiftName": "Standard Morning (08:00 - 17:00)",
      "firstCheckIn": "2026-11-04T08:04:12Z",
      "lastCheckOut": "2026-11-04T17:15:30Z",
      "lateMinutes": 0,
      "earlyDepartureMinutes": 0,
      "workMinutes": 491,
      "overtimeMinutes": 15,
      "status": "PRESENT"
    }
  ]
}
```

### 6.2. Recalculate Attendance
- **Endpoint**: `POST /api/v1/attendance/recalculate`
- **Request Body**:
```json
{
  "startDate": "2026-11-01",
  "endDate": "2026-11-04",
  "employeeId": null
}
```
- **Response**: Reprocesses raw punch events through schedule and shift rules.

### 6.3. Attendance Correction Requests
- **Endpoint**: `POST /api/v1/attendance/corrections`
- **Request Body**:
```json
{
  "employeeId": 12,
  "attendanceDate": "2026-11-04",
  "requestedCheckIn": "2026-11-04T08:00:00Z",
  "requestedCheckOut": "2026-11-04T17:00:00Z",
  "reason": "Biometric device offline during morning rush"
}
```
- **Approve**: `POST /api/v1/attendance/corrections/{id}/approve`
- **Reject**: `POST /api/v1/attendance/corrections/{id}/reject`

---

## 7. Reports & Export Endpoints

All reports support streaming binary download with proper `Content-Disposition` attachment headers.

- **Export Excel (.xlsx)**:
  - `GET /api/v1/reports/export/excel?startDate=2026-11-01&endDate=2026-11-30&departmentId=1`
  - MIME: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Export CSV (.csv)**:
  - `GET /api/v1/reports/export/csv?startDate=2026-11-01&endDate=2026-11-30`
  - MIME: `text/csv; charset=UTF-8`
- **Export PDF (.pdf)**:
  - `GET /api/v1/reports/export/pdf?startDate=2026-11-01&endDate=2026-11-30`
  - MIME: `application/pdf`

---

## 8. School MIS Integration

Secure webhook and programmatic synchronization interface for external School Management Information Systems.

- **Headers**: `X-MIS-API-KEY: <configured_api_key>`
- **Sync Staff**: `POST /api/v1/mis/sync-staff`
- **Sync Students**: `POST /api/v1/mis/sync-students`
- **MIS Webhook Attendance Push**:
  - Automatically triggered upon record finalization to the external endpoint configured in System Settings (`mis.webhook.url`).

---

## 9. Error Codes Reference

| Error Code | HTTP Status | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Invalid or expired JWT token |
| `FORBIDDEN` | 403 | User lacks required role or permission |
| `RESOURCE_NOT_FOUND` | 404 | Entity ID not found in database |
| `VALIDATION_FAILED` | 400 | Request body failed constraints |
| `DEVICE_OFFLINE` | 503 | Biometric terminal did not reply to TCP socket |
| `IDEMPOTENCY_CONFLICT` | 409 | Raw attendance log punch already recorded |
| `SHIFT_OVERLAP_ERROR` | 400 | Schedule conflict detected for employee |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected system exception |

