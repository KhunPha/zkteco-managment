# System Architecture: Enterprise ZKTeco Biometric Attendance Platform

## 1. Architectural Philosophy

The platform is designed as a **Modular Monolith** with strict domain boundaries, allowing high cohesion, high developer velocity, and a straightforward path to future microservices extraction.

### Core Architecture Highlights:
- **Database Ownership**: The application owns 100% of the database schema and attendance calculation engine. ZKTeco physical terminals act solely as identification and data capture peripherals.
- **Biometric Device Client Abstraction**: High-level interface `BiometricDeviceClient` decoupled from underlying network transport (`ZKTecoTcpClient` socket protocol and `ZKTecoPushHandler` ADMS HTTP push).
- **Idempotency Guarantee**: Every biometric punch is assigned an SHA-256 idempotency key composed of `deviceSn + "_" + pin + "_" + punchTime` to prevent duplicate log creation.
- **Auditing & Immutability**: Raw terminal logs in `attendance_raw_logs` are immutable and never modified during attendance corrections.

```
                      +-----------------------------+
                      |   ZKTeco Biometric Device   |
                      | (Fingerprint / Face Terminal)|
                      +--------------+--------------+
                                     |
               +---------------------+---------------------+
               |                                           |
   [TCP Socket Port 4370]                        [ADMS HTTP Push]
   Binary Packet Protocol                        /iclock/cdata & /iclock/getrequest
               |                                           |
               v                                           v
       +---------------+                           +---------------+
       | ZKTecoTcpClient|                          | ZKTecoPushSvc |
       +-------+-------+                           +-------+-------+
               |                                           |
               +---------------------+---------------------+
                                     |
                                     v
                       +---------------------------+
                       | attendance_raw_logs Table | (Immutable Events)
                       +-------------+-------------+
                                     |
                                     v
                       +---------------------------+
                       | AttendanceCalculationEng  |
                       |  - Shift matching         |
                       |  - Grace late / early exit|
                       |  - Overtime & breaks      |
                       +-------------+-------------+
                                     |
                                     v
                       +---------------------------+
                       | attendance_records Table  | (Processed Daily)
                       +-------------+-------------+
                                     |
                                     v
                       +---------------------------+
                       | Next.js App Router (JSX)  |
                       | Administrative Dashboard  |
                       +---------------------------+
```

## 2. Backend Module Boundaries

1. `modules.auth`: User authentication, JWT issuance, hashed refresh token rotation.
2. `modules.user`: RBAC user accounts, roles, and granular permission enforcement.
3. `modules.organization`: Multi-campus branches, departments, and position job titles.
4. `modules.personnel`: Full-time/contract employee management and student rosters.
5. `modules.device`: Hardware device CRUD, connection status tracking, and PIN-to-employee mapping.
6. `modules.zkteco`: TCP/IP standalone client protocol and ADMS HTTP push endpoints.
7. `modules.attendance`: Raw log ingestion, daily calculated attendance, and supervisor correction workflows.
8. `modules.shift`: Flexible shift rules, break durations, and employee weekly rosters.
9. `modules.leave`: Statutory leave types, balances, applications, and holiday calendars.
10. `modules.report`: Daily/monthly reporting engine with Excel (.xlsx), CSV, and PDF exports.
11. `modules.dashboard`: Real-time telemetry, attendance percentages, and Recharts analytics.
12. `modules.audit`: Comprehensive forensic audit logging.
13. `modules.system`: System-wide settings and in-app alerts.
14. `modules.mis`: School MIS integration layer with API key authorization and personnel webhooks.

