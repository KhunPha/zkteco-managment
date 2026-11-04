# Database Architecture & Flyway Migrations

## 1. Overview
The database layer uses **PostgreSQL 16** with strict relational integrity, composite unique constraints, performance indexes, and Flyway database migrations (`V1` through `V6`).

## 2. Table Directory

| Table Name | Description | Key Constraints & Indexes |
|------------|-------------|---------------------------|
| `users` | Administrative user accounts | Unique (`username`, `email`), index on `username` |
| `roles` | System roles (RBAC) | Unique (`name`) |
| `permissions` | Granular permission definitions | Unique (`code`) |
| `refresh_tokens` | Secure SHA-256 hashed refresh tokens | Unique (`token_hash`), FK `user_id` |
| `audit_logs` | Immutable audit trail | Index on `created_at`, (`entity_type`, `entity_id`) |
| `branches` | Physical campus offices | Unique (`code`) |
| `departments` | Organizational departments | Unique (`code`), FK `branch_id` |
| `positions` | Job titles and designations | Unique (`code`) |
| `employees` | Staff profiles | Unique (`employee_code`), FKs to dept, position, branch |
| `students` | Student profiles | Unique (`student_code`) |
| `attendance_devices` | ZKTeco terminals | Unique (`serial_number`), index on `serial_number` |
| `attendance_device_users` | Biometric PIN mappings | Composite Unique (`device_id`, `device_pin`) |
| `attendance_raw_logs` | Raw event log buffer | Unique (`idempotency_key`), index on (`device_pin`, `punch_time`) |
| `attendance_records` | Daily computed attendance | Composite Unique (`employee_id`, `attendance_date`), index on `status` |
| `attendance_corrections` | Adjustment requests & reviews | FK `employee_id`, FK `attendance_record_id` |
| `shifts` | Work hours, breaks, grace rules | Unique (`code`) |
| `employee_schedules` | Weekly shift assignments | FK `employee_id`, FK `shift_id` |
| `leave_types` | Leave categories | Unique (`code`) |
| `leave_requests` | Leave applications & approvals | FK `employee_id`, FK `leave_type_id` |
| `leave_balances` | Annual quota tracking | Composite Unique (`employee_id`, `leave_type_id`, `year`) |
| `holidays` | Calendar closures | Unique (`holiday_date`) |
| `system_settings` | Dynamic configuration keys | Unique (`setting_key`) |

## 3. Idempotency & Deduplication
Raw logs ingested via ADMS or TCP pull compute an idempotency key:
$$\text{idempotency\_key} = \text{SHA-256}(\text{device\_sn} \parallel \text{"\_"} \parallel \text{device\_pin} \parallel \text{"\_"} \parallel \text{punch\_time})$$
Duplicates are ignored at the database constraint level.

## 4. Timezone Strategy
All timestamp fields use `TIMESTAMP WITH TIME ZONE` stored in UTC. The application context transforms to and from `Asia/Phnom_Penh` (+07:00).

