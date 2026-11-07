package com.zkteco.attendance.modules.attendance;

import com.zkteco.attendance.common.TimeUtils;
import com.zkteco.attendance.modules.biometric.FaceBiometric;
import com.zkteco.attendance.modules.biometric.FaceBiometricRepository;
import com.zkteco.attendance.modules.device.AttendanceDeviceUser;
import com.zkteco.attendance.modules.device.DeviceUserRepository;
import com.zkteco.attendance.modules.leave.HolidayRepository;
import com.zkteco.attendance.modules.leave.LeaveRequest;
import com.zkteco.attendance.modules.leave.LeaveRequestRepository;
import com.zkteco.attendance.modules.personnel.Employee;
import com.zkteco.attendance.modules.personnel.EmployeeRepository;
import com.zkteco.attendance.modules.personnel.Student;
import com.zkteco.attendance.modules.personnel.StudentRepository;
import com.zkteco.attendance.modules.shift.EmployeeSchedule;
import com.zkteco.attendance.modules.shift.EmployeeScheduleRepository;
import com.zkteco.attendance.modules.shift.Shift;
import com.zkteco.attendance.modules.shift.ShiftRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class AttendanceCalculationEngine {

    private final EmployeeRepository employeeRepository;
    private final EmployeeScheduleRepository scheduleRepository;
    private final ShiftRepository shiftRepository;
    private final DeviceUserRepository deviceUserRepository;
    private final AttendanceRawLogRepository rawLogRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AttendanceProcessingLogRepository processingLogRepository;
    private final HolidayRepository holidayRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final StudentRepository studentRepository;
    private final FaceBiometricRepository faceBiometricRepository;

    @Transactional
    public AttendanceProcessingLog processAttendanceForDate(LocalDate date) {
        log.info("Starting attendance processing calculation for date: {}", date);
        Instant startOfDay = date.atStartOfDay(TimeUtils.PHNOM_PENH_ZONE).toInstant();
        Instant endOfDay = date.plusDays(1).atStartOfDay(TimeUtils.PHNOM_PENH_ZONE).toInstant();

        // 1. Fetch all raw logs for the target day
        List<AttendanceRawLog> dayLogs = rawLogRepository.findByPunchTimeBetweenOrderByPunchTimeAsc(startOfDay, endOfDay);
        int totalRawLogs = dayLogs.size();
        int processedCount = 0;
        int errorCount = 0;
        StringBuilder errorDetails = new StringBuilder();

        // Group logs by device PIN
        Map<String, List<AttendanceRawLog>> logsByPin = dayLogs.stream()
                .collect(Collectors.groupingBy(AttendanceRawLog::getDevicePin));

        // 2. Fetch default shift fallback
        Shift defaultShift = shiftRepository.findByCode("SHIFT_MORNING")
                .orElseGet(() -> shiftRepository.findAll().stream().findFirst().orElse(null));

        boolean isPublicHoliday = holidayRepository.isHolidayOnDate(date);

        // Pre-load all device user PINs mapped by employee ID and student ID (High performance batching)
        Map<Long, Set<String>> pinsByEmpId = new HashMap<>();
        Map<Long, Set<String>> pinsByStudentId = new HashMap<>();
        for (AttendanceDeviceUser u : deviceUserRepository.findAll()) {
            if (u.getEmployee() != null && u.getDevicePin() != null) {
                pinsByEmpId.computeIfAbsent(u.getEmployee().getId(), k -> new HashSet<>()).add(u.getDevicePin());
            }
            if (u.getStudent() != null && u.getDevicePin() != null) {
                pinsByStudentId.computeIfAbsent(u.getStudent().getId(), k -> new HashSet<>()).add(u.getDevicePin());
            }
        }
        for (FaceBiometric fb : faceBiometricRepository.findAll()) {
            if (fb.getEmployee() != null && fb.getDevicePin() != null) {
                pinsByEmpId.computeIfAbsent(fb.getEmployee().getId(), k -> new HashSet<>()).add(fb.getDevicePin());
            }
            if (fb.getStudent() != null && fb.getDevicePin() != null) {
                pinsByStudentId.computeIfAbsent(fb.getStudent().getId(), k -> new HashSet<>()).add(fb.getDevicePin());
            }
        }

        // Pre-load existing records for the target date
        List<AttendanceRecord> existingRecords = attendanceRecordRepository.findByAttendanceDate(date);
        Map<Long, AttendanceRecord> existingByEmpId = new HashMap<>();
        Map<Long, AttendanceRecord> existingByStudentId = new HashMap<>();
        for (AttendanceRecord r : existingRecords) {
            if (r.getEmployee() != null) existingByEmpId.put(r.getEmployee().getId(), r);
            if (r.getStudent() != null) existingByStudentId.put(r.getStudent().getId(), r);
        }

        List<AttendanceRecord> recordsToSave = new ArrayList<>();

        // 3. Process each active employee
        List<Employee> employees = employeeRepository.findAll().stream()
                .filter(e -> e.getDeletedAt() == null && "ACTIVE".equalsIgnoreCase(e.getEmploymentStatus()))
                .toList();

        for (Employee emp : employees) {
            try {
                // Check if an existing manual adjustment is present
                Optional<AttendanceRecord> existingOpt = Optional.ofNullable(existingByEmpId.get(emp.getId()));
                if (existingOpt.isPresent() && existingOpt.get().isManualAdjusted()) {
                    continue; // Preserve approved manual corrections!
                }

                // Determine active shift and schedule for this day
                List<EmployeeSchedule> schedules = scheduleRepository.findActiveSchedules(emp.getId(), date);
                Shift shift = defaultShift;
                boolean isScheduledWorkDay = true;

                if (!schedules.isEmpty()) {
                    EmployeeSchedule schedule = schedules.get(0);
                    shift = schedule.getShift();
                    isScheduledWorkDay = schedule.isWorkingDay(date.getDayOfWeek());
                } else {
                    // Default Monday to Friday
                    DayOfWeek dow = date.getDayOfWeek();
                    isScheduledWorkDay = (dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY);
                }

                // Check leave status
                List<LeaveRequest> approvedLeaves = leaveRequestRepository.findApprovedLeavesOnDate(emp.getId(), date);
                boolean isOnLeave = !approvedLeaves.isEmpty();

                // Find all device PINs assigned to this employee
                Set<String> pins = new HashSet<>(pinsByEmpId.getOrDefault(emp.getId(), Collections.emptySet()));
                if (emp.getEmployeeCode() != null) {
                    pins.add(emp.getEmployeeCode());
                }

                // Collect punches for this employee
                List<AttendanceRawLog> empPunches = new ArrayList<>();
                for (String pin : pins) {
                    List<AttendanceRawLog> pinLogs = logsByPin.get(pin);
                    if (pinLogs != null) {
                        empPunches.addAll(pinLogs);
                    }
                }
                empPunches.sort(Comparator.comparing(AttendanceRawLog::getPunchTime));

                AttendanceRecord record = existingOpt.orElseGet(() -> AttendanceRecord.builder()
                        .employee(emp)
                        .attendanceDate(date)
                        .build());

                record.setShift(shift);

                if (empPunches.isEmpty()) {
                    // No punches recorded for this employee
                    if (isOnLeave) {
                        record.setStatus("ON_LEAVE");
                        record.setRemarks("Approved " + approvedLeaves.get(0).getLeaveType().getName());
                    } else if (isPublicHoliday) {
                        record.setStatus("HOLIDAY");
                        record.setRemarks("Official Holiday");
                    } else if (!isScheduledWorkDay) {
                        record.setStatus("REST_DAY");
                        record.setRemarks("Scheduled rest day");
                    } else {
                        record.setStatus("ABSENT");
                        record.setRemarks("No punch logs recorded on scheduled workday");
                    }
                    record.setFirstCheckIn(null);
                    record.setShift1CheckOut(null);
                    record.setShift2CheckIn(null);
                    record.setShift2CheckOut(null);
                    record.setLastCheckOut(null);
                    record.setTotalWorkMinutes(0);
                    record.setLateMinutes(0);
                    record.setEarlyLeaveMinutes(0);
                    record.setOvertimeMinutes(0);
                } else {
                    // Employee has punches! Resolve Shift 1 and Shift 2 windows
                    TwoShiftPunches tsp = resolveTwoShiftPunches(empPunches, shift);

                    Instant firstCheckIn = tsp.s1In != null ? tsp.s1In : tsp.s2In;
                    Instant lastCheckOut = tsp.s2Out != null ? tsp.s2Out : (tsp.s1Out != null ? tsp.s1Out : null);

                    record.setFirstCheckIn(firstCheckIn);
                    record.setShift1CheckOut(tsp.s1Out);
                    record.setShift2CheckIn(tsp.s2In);
                    record.setShift2CheckOut(tsp.s2Out);
                    record.setLastCheckOut(lastCheckOut != null && !lastCheckOut.equals(firstCheckIn) ? lastCheckOut : null);

                    record.setInDevice(tsp.inDevice);
                    record.setOutDevice(tsp.outDevice);

                    // Calculation based on shift parameters
                    int lateMinutes = 0;
                    int earlyLeaveMinutes = 0;
                    int overtimeMinutes = 0;
                    int breakMinutes = 0;
                    int totalWorkMinutes = 0;

                    if (shift != null) {
                        int graceLate = shift.getGraceLateMinutes();
                        int graceEarly = shift.getGraceEarlyLeaveMinutes();

                        // 1. Shift 1 Late Calculation
                        int s1Late = 0;
                        if (tsp.s1In != null) {
                            LocalTime s1InTime = TimeUtils.toPhnomPenhLocalTime(tsp.s1In);
                            LocalTime shiftStart = shift.getStartTime();
                            if (s1InTime.isAfter(shiftStart.plusMinutes(graceLate))) {
                                s1Late = (int) Duration.between(shiftStart, s1InTime).toMinutes();
                            }
                        }

                        // 2. Shift 2 Late Calculation (Afternoon shift starting after break)
                        int s2Late = 0;
                        if (tsp.s2In != null && shift.getBreakEnd() != null) {
                            LocalTime s2InTime = TimeUtils.toPhnomPenhLocalTime(tsp.s2In);
                            LocalTime s2Start = shift.getBreakEnd();
                            if (s2InTime.isAfter(s2Start.plusMinutes(graceLate))) {
                                s2Late = (int) Duration.between(s2Start, s2InTime).toMinutes();
                            }
                        } else if (tsp.s1In == null && tsp.s2In != null && shift.getBreakEnd() == null) {
                            LocalTime s2InTime = TimeUtils.toPhnomPenhLocalTime(tsp.s2In);
                            LocalTime shiftStart = shift.getStartTime();
                            if (s2InTime.isAfter(shiftStart.plusMinutes(graceLate))) {
                                s2Late = (int) Duration.between(shiftStart, s2InTime).toMinutes();
                            }
                        }

                        // Total late minutes across both Shift 1 and Shift 2
                        lateMinutes = s1Late + s2Late;

                        // Break duration
                        if (shift.getBreakStart() != null && shift.getBreakEnd() != null) {
                            breakMinutes = (int) Duration.between(shift.getBreakStart(), shift.getBreakEnd()).toMinutes();
                        }

                        // Early Departure & Overtime (only when afternoon/final check-out exists, or when not current ongoing day)
                        if (tsp.s2Out != null || (tsp.s1Out != null && tsp.s2In == null && !date.equals(LocalDate.now()))) {
                            Instant effectiveOut = tsp.s2Out != null ? tsp.s2Out : tsp.s1Out;
                            LocalTime outLocalTime = TimeUtils.toPhnomPenhLocalTime(effectiveOut);
                            LocalTime shiftEnd = shift.getEndTime();

                            if (outLocalTime.isBefore(shiftEnd.minusMinutes(graceEarly))) {
                                earlyLeaveMinutes = (int) Duration.between(outLocalTime, shiftEnd).toMinutes();
                            } else if (outLocalTime.isAfter(shiftEnd)) {
                                overtimeMinutes = (int) Duration.between(shiftEnd, outLocalTime).toMinutes();
                            }
                        }

                        // Accurate total work time across 2 shifts
                        if (tsp.s1In != null && tsp.s1Out != null && tsp.s2In != null && tsp.s2Out != null) {
                            // Staff punched in and out for both Shift 1 and Shift 2
                            long s1 = Duration.between(tsp.s1In, tsp.s1Out).toMinutes();
                            long s2 = Duration.between(tsp.s2In, tsp.s2Out).toMinutes();
                            totalWorkMinutes = (int) (Math.max(0, s1) + Math.max(0, s2));
                        } else if (tsp.s1In != null && tsp.s1Out != null && tsp.s2In == null) {
                            totalWorkMinutes = (int) Math.max(0, Duration.between(tsp.s1In, tsp.s1Out).toMinutes());
                        } else if (tsp.s2In != null && tsp.s2Out != null && tsp.s1In == null) {
                            totalWorkMinutes = (int) Math.max(0, Duration.between(tsp.s2In, tsp.s2Out).toMinutes());
                        } else if (firstCheckIn != null && record.getLastCheckOut() != null) {
                            long rawDuration = Duration.between(firstCheckIn, record.getLastCheckOut()).toMinutes();
                            totalWorkMinutes = (int) Math.max(0, rawDuration - breakMinutes);
                        }
                    }

                    record.setLateMinutes(lateMinutes);
                    record.setEarlyLeaveMinutes(earlyLeaveMinutes);
                    record.setOvertimeMinutes(overtimeMinutes);
                    record.setBreakMinutes(breakMinutes);
                    record.setTotalWorkMinutes(totalWorkMinutes);

                    // Determine final status
                    if (lateMinutes > 0) {
                        record.setStatus("LATE");
                    } else if (earlyLeaveMinutes > 0) {
                        record.setStatus("EARLY_DEPARTURE");
                    } else {
                        record.setStatus("PRESENT");
                    }
                }

                recordsToSave.add(record);
                processedCount++;

            } catch (Exception ex) {
                errorCount++;
                errorDetails.append(emp.getEmployeeCode()).append(": ").append(ex.getMessage()).append("; ");
                log.error("Error calculating attendance for employee {}: {}", emp.getEmployeeCode(), ex.getMessage());
            }
        }

        // 4. Process each active student (Grade / Classroom attendance)
        List<Student> students = studentRepository.findAll().stream()
                .filter(s -> s.getDeletedAt() == null && "ACTIVE".equalsIgnoreCase(s.getStatus()))
                .toList();

        for (Student st : students) {
            try {
                Optional<AttendanceRecord> existingOpt = Optional.ofNullable(existingByStudentId.get(st.getId()));
                if (existingOpt.isPresent() && existingOpt.get().isManualAdjusted()) {
                    continue; // Preserve approved manual corrections
                }

                // Collect device PINs linked to this student
                Set<String> pins = new HashSet<>(pinsByStudentId.getOrDefault(st.getId(), Collections.emptySet()));
                if (st.getStudentCode() != null) {
                    pins.add(st.getStudentCode());
                }

                List<AttendanceRawLog> stPunches = new ArrayList<>();
                for (String pin : pins) {
                    List<AttendanceRawLog> pinLogs = logsByPin.get(pin);
                    if (pinLogs != null) {
                        stPunches.addAll(pinLogs);
                    }
                }
                stPunches.sort(Comparator.comparing(AttendanceRawLog::getPunchTime));

                AttendanceRecord record = existingOpt.orElseGet(() -> AttendanceRecord.builder()
                        .student(st)
                        .attendanceDate(date)
                        .build());

                record.setShift(defaultShift);

                if (stPunches.isEmpty()) {
                    DayOfWeek dow = date.getDayOfWeek();
                    boolean isSchoolDay = (dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY);
                    if (isPublicHoliday) {
                        record.setStatus("HOLIDAY");
                        record.setRemarks("Official Holiday");
                    } else if (!isSchoolDay) {
                        record.setStatus("REST_DAY");
                        record.setRemarks("Weekend");
                    } else {
                        record.setStatus("ABSENT");
                        record.setRemarks("Student absent - no punch recorded");
                    }
                    record.setFirstCheckIn(null);
                    record.setShift1CheckOut(null);
                    record.setShift2CheckIn(null);
                    record.setShift2CheckOut(null);
                    record.setLastCheckOut(null);
                    record.setTotalWorkMinutes(0);
                    record.setLateMinutes(0);
                    record.setEarlyLeaveMinutes(0);
                    record.setOvertimeMinutes(0);
                } else {
                    TwoShiftPunches tsp = resolveTwoShiftPunches(stPunches, defaultShift);
                    Instant firstCheckIn = tsp.s1In != null ? tsp.s1In : tsp.s2In;
                    Instant lastCheckOut = tsp.s2Out != null ? tsp.s2Out : (tsp.s1Out != null ? tsp.s1Out : null);

                    record.setFirstCheckIn(firstCheckIn);
                    record.setShift1CheckOut(tsp.s1Out);
                    record.setShift2CheckIn(tsp.s2In);
                    record.setShift2CheckOut(tsp.s2Out);
                    record.setLastCheckOut(lastCheckOut != null && !lastCheckOut.equals(firstCheckIn) ? lastCheckOut : null);

                    record.setInDevice(tsp.inDevice);
                    record.setOutDevice(tsp.outDevice);

                    int lateMinutes = 0;
                    if (defaultShift != null) {
                        int graceLate = defaultShift.getGraceLateMinutes();
                        int s1Late = 0;
                        if (tsp.s1In != null) {
                            LocalTime s1InTime = TimeUtils.toPhnomPenhLocalTime(tsp.s1In);
                            LocalTime shiftStart = defaultShift.getStartTime();
                            if (s1InTime.isAfter(shiftStart.plusMinutes(graceLate))) {
                                s1Late = (int) Duration.between(shiftStart, s1InTime).toMinutes();
                            }
                        }
                        int s2Late = 0;
                        if (tsp.s2In != null && defaultShift.getBreakEnd() != null) {
                            LocalTime s2InTime = TimeUtils.toPhnomPenhLocalTime(tsp.s2In);
                            LocalTime s2Start = defaultShift.getBreakEnd();
                            if (s2InTime.isAfter(s2Start.plusMinutes(graceLate))) {
                                s2Late = (int) Duration.between(s2Start, s2InTime).toMinutes();
                            }
                        } else if (tsp.s1In == null && tsp.s2In != null && defaultShift.getBreakEnd() == null) {
                            LocalTime s2InTime = TimeUtils.toPhnomPenhLocalTime(tsp.s2In);
                            LocalTime shiftStart = defaultShift.getStartTime();
                            if (s2InTime.isAfter(shiftStart.plusMinutes(graceLate))) {
                                s2Late = (int) Duration.between(shiftStart, s2InTime).toMinutes();
                            }
                        }
                        lateMinutes = s1Late + s2Late;
                    }

                    record.setLateMinutes(lateMinutes);
                    record.setStatus(lateMinutes > 0 ? "LATE" : "PRESENT");
                    record.setTotalWorkMinutes(record.getLastCheckOut() != null
                            ? (int) Duration.between(firstCheckIn, record.getLastCheckOut()).toMinutes()
                            : 0);
                    record.setRemarks("Student verified attendance");
                }

                recordsToSave.add(record);
                processedCount++;

            } catch (Exception ex) {
                errorCount++;
                errorDetails.append(st.getStudentCode()).append(": ").append(ex.getMessage()).append("; ");
                log.error("Error calculating attendance for student {}: {}", st.getStudentCode(), ex.getMessage());
            }
        }

        // Save all records in one fast batch
        if (!recordsToSave.isEmpty()) {
            attendanceRecordRepository.saveAll(recordsToSave);
        }

        // Mark raw logs as processed
        for (AttendanceRawLog rl : dayLogs) {
            rl.setProcessed(true);
            rl.setProcessedAt(Instant.now());
        }
        rawLogRepository.saveAll(dayLogs);

        // Record execution summary log
        AttendanceProcessingLog procLog = AttendanceProcessingLog.builder()
                .processDate(date)
                .totalRawLogs(totalRawLogs)
                .totalProcessed(processedCount)
                .totalErrors(errorCount)
                .errorDetails(errorDetails.length() > 0 ? errorDetails.toString() : null)
                .executedAt(Instant.now())
                .build();

        return processingLogRepository.save(procLog);
    }

    private static class TwoShiftPunches {
        Instant s1In;
        Instant s1Out;
        Instant s2In;
        Instant s2Out;
        com.zkteco.attendance.modules.device.AttendanceDevice inDevice;
        com.zkteco.attendance.modules.device.AttendanceDevice outDevice;
    }

    /**
     * Resolves up to 4 punches per day for standard 2-shift operations:
     * - Shift 1 In: Morning First Check-In
     * - Shift 1 Out: Midday Lunch Break Check-Out
     * - Shift 2 In: Midday Lunch Resume Check-In
     * - Shift 2 Out: Evening Final Check-Out
     */
    private TwoShiftPunches resolveTwoShiftPunches(List<AttendanceRawLog> punches, Shift shift) {
        TwoShiftPunches res = new TwoShiftPunches();
        if (punches == null || punches.isEmpty()) {
            return res;
        }

        LocalTime breakStart = (shift != null && shift.getBreakStart() != null)
                ? shift.getBreakStart() : LocalTime.of(12, 0);
        LocalTime breakEnd = (shift != null && shift.getBreakEnd() != null)
                ? shift.getBreakEnd() : LocalTime.of(13, 0);
        LocalTime midBreak = breakStart.plusMinutes(Duration.between(breakStart, breakEnd).toMinutes() / 2);

        // Group punches into morning (< midBreak) and afternoon (>= midBreak)
        List<AttendanceRawLog> morningPunches = new ArrayList<>();
        List<AttendanceRawLog> afternoonPunches = new ArrayList<>();

        for (AttendanceRawLog p : punches) {
            LocalTime lt = TimeUtils.toPhnomPenhLocalTime(p.getPunchTime());
            String state = p.getPunchState() != null ? p.getPunchState().toUpperCase() : "";

            if ("BREAK_OUT".equals(state)) {
                morningPunches.add(p);
            } else if ("BREAK_IN".equals(state)) {
                afternoonPunches.add(p);
            } else if (lt.isBefore(midBreak)) {
                morningPunches.add(p);
            } else {
                afternoonPunches.add(p);
            }
        }

        // 1. Shift 1 (Morning Window)
        if (!morningPunches.isEmpty()) {
            res.s1In = morningPunches.get(0).getPunchTime();
            res.inDevice = morningPunches.get(0).getDevice();
            if (morningPunches.size() > 1) {
                res.s1Out = morningPunches.get(morningPunches.size() - 1).getPunchTime();
            }
        }

        // 2. Shift 2 (Afternoon Window)
        if (!afternoonPunches.isEmpty()) {
            if (afternoonPunches.size() == 1) {
                if (res.s1In != null) {
                    res.s2Out = afternoonPunches.get(0).getPunchTime();
                    res.outDevice = afternoonPunches.get(0).getDevice();
                } else {
                    res.s2In = afternoonPunches.get(0).getPunchTime();
                    res.inDevice = afternoonPunches.get(0).getDevice();
                }
            } else {
                res.s2In = afternoonPunches.get(0).getPunchTime();
                res.s2Out = afternoonPunches.get(afternoonPunches.size() - 1).getPunchTime();
                res.outDevice = afternoonPunches.get(afternoonPunches.size() - 1).getDevice();
            }
        }

        if (res.inDevice == null && !punches.isEmpty()) {
            res.inDevice = punches.get(0).getDevice();
        }
        if (res.outDevice == null && punches.size() > 1) {
            res.outDevice = punches.get(punches.size() - 1).getDevice();
        }

        return res;
    }
}

