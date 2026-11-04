# Attendance Rules & Calculation Engine Specification

This document details the business logic, mathematical formulas, state machine, and edge-case handling implemented in the **Attendance Calculation Engine** (`AttendanceCalculationEngine.java`).

---

## 1. Engine Architecture & Flow

Attendance processing operates in two distinct stages:

```
  [ ZKTeco Hardware Terminal ]
                |
                v (Socket / ADMS HTTP)
  +-----------------------------+
  |    attendance_raw_logs      |  <-- Stage 1: Ingestion
  | (Immutable, Idempotent)     |      Preserves raw hardware telemetry.
  +--------------+--------------+
                 |
                 v (Scheduled or On-Demand Batch)
  +-----------------------------+
  | AttendanceCalculationEngine |  <-- Stage 2: Evaluation
  | - Shift Schedule Lookup     |      Applies business policies, grace
  | - Holiday / Leave Checks    |      windows, breaks, and overtime.
  +--------------+--------------+
                 |
                 v
  +-----------------------------+
  |    attendance_records       |  <-- Final Processed Attendance
  | (Daily Employee Summaries)  |      Queried by dashboards & reports.
  +-----------------------------+
```

---

## 2. Shift Configuration Parameters

Every work schedule is governed by a `Shift` entity containing the following rules:

| Field | Type | Description | Example |
|---|---|---|---|
| `startTime` | LocalTime | Mandatory shift start | `08:00:00` |
| `endTime` | LocalTime | Mandatory shift end | `17:00:00` |
| `graceLateMinutes` | Integer | Allowed tardiness before penalization | `15` minutes |
| `graceEarlyDepartureMinutes` | Integer | Allowed early departure before penalization | `0` minutes |
| `breakDurationMinutes` | Integer | Unpaid break time deducted from work time | `60` minutes |
| `requiredWorkMinutes` | Integer | Standard expected working time | `480` minutes (8h) |
| `overtimeThresholdMinutes` | Integer | Minimum post-shift time before OT counts | `30` minutes |
| `isNightShift` | Boolean | Flags whether the shift crosses midnight | `false` |

---

## 3. Mathematical Formulas

### 3.1. Late Arrival Calculation
Let $T_{in}$ be the employee's first check-in time, $T_{start}$ the scheduled shift start time, and $G_{late}$ the grace period in minutes.

$$
Minutes_{late} = 
\begin{cases} 
0, & \text{if } T_{in} \le T_{start} + G_{late} \\
T_{in} - T_{start}, & \text{if } T_{in} > T_{start} + G_{late}
\end{cases}
$$

> **Example**:
> - Shift Start = `08:00`, Grace Period = `15` mins.
> - Punch at `08:14` $\rightarrow$ Late Minutes = `0` (within grace period).
> - Punch at `08:22` $\rightarrow$ Late Minutes = `22` (calculated from official start time).

---

### 3.2. Early Departure Calculation
Let $T_{out}$ be the employee's last check-out time, $T_{end}$ the scheduled shift end time, and $G_{early}$ the early exit tolerance.

$$
Minutes_{early} = 
\begin{cases} 
0, & \text{if } T_{out} \ge T_{end} - G_{early} \\
T_{end} - T_{out}, & \text{if } T_{out} < T_{end} - G_{early}
\end{cases}
$$

> **Example**:
> - Shift End = `17:00`, Tolerance = `0` mins.
> - Punch at `16:45` $\rightarrow$ Early Departure = `15` minutes.

---

### 3.3. Working Minutes & Net Hours
Gross time elapsed between check-in and check-out minus scheduled unpaid break duration:

$$
Minutes_{gross} = T_{out} - T_{in}
$$

$$
Minutes_{net} = \max\left(0, Minutes_{gross} - Minutes_{break}\right)
$$

---

### 3.4. Overtime (OT) Calculation
Overtime is calculated only after exceeding standard shift requirements plus the minimum threshold:

$$
Minutes_{ot} = 
\begin{cases} 
0, & \text{if } (T_{out} - T_{end}) < OT_{threshold} \\
T_{out} - T_{end}, & \text{if } (T_{out} - T_{end}) \ge OT_{threshold}
\end{cases}
$$

For weekend and holiday attendance, 100% of verified work time is categorized as special rate overtime.

---

## 4. Daily Attendance Status State Machine

The calculation engine assigns each employee a daily status based on the following precedence hierarchy:

```
                  [ Employee Daily Schedule ]
                               |
                Is Holiday or Approved Leave?
                     /                  \
                  YES                    NO
                  /                        \
         [ HOLIDAY / ON_LEAVE ]      Any Punch Logs Found?
                                          /          \
                                       YES            NO
                                       /                \
                         Both In and Out Present?    [ ABSENT ]
                                /           \
                             YES             NO
                             /                 \
                 Net Work >= 50%?          [ INCOMPLETE / HALF_DAY ]
                     /          \
                   YES           NO
                   /               \
         T_in > Grace?        [ HALF_DAY ]
             /     \
           YES      NO
           /          \
       [ LATE ]   [ PRESENT ]
```

| Status | Code | Condition |
|---|---|---|
| **PRESENT** | `PRESENT` | Checked in within grace window and completed required shift hours. |
| **LATE** | `LATE` | Checked in after shift start + grace window, but completed the shift. |
| **EARLY_DEPARTURE** | `EARLY_DEPARTURE` | Checked in on time but departed before shift end time. |
| **HALF_DAY** | `HALF_DAY` | Total net work minutes between 50% and 75% of required hours. |
| **ABSENT** | `ABSENT` | No valid check-in recorded on a scheduled workday without approved leave. |
| **ON_LEAVE** | `ON_LEAVE` | Approved leave request exists for the employee on the target date. |
| **HOLIDAY** | `HOLIDAY` | The date matches an official holiday entry in the company calendar. |
| **REST_DAY** | `REST_DAY` | Non-working scheduled day (e.g., Saturday / Sunday). |

---

## 5. Overnight & Cross-Midnight Shifts

For night shifts (e.g., security officers or hospital staff working `22:00` to `06:00`):
1. **Shift Flag**: `is_night_shift = true`.
2. **Date Anchoring**: Attendance records are anchored to the **day the shift started**.
3. **Punch Pairing Window**: The engine searches for punches starting from `ShiftStart - 2 hours` (e.g. 20:00 on Day 1) up to `ShiftEnd + 4 hours` (e.g. 10:00 on Day 2).
4. **Day Increment**: Any punch occurring after midnight ($T_{punch} < T_{start}$) is automatically evaluated as $(T_{punch} + 24\text{ hours})$.

---

## 6. Attendance Correction & Audit Workflow

When an employee forgets to punch or a biometric terminal loses power:
1. **Request**: The employee or department manager submits an `AttendanceCorrection` specifying the missing `requestedCheckIn` or `requestedCheckOut` and a mandatory explanation.
2. **Approval**: An authorized manager approves the request via `POST /api/v1/attendance/corrections/{id}/approve`.
3. **Execution**:
   - The original raw punches in `attendance_raw_logs` **remain unchanged** for forensic integrity.
   - The daily record in `attendance_records` is updated with corrected times and recalculates late, overtime, and work minutes.
   - `is_manually_corrected` is set to `true`, and `correction_id` links back to the approved ticket.

