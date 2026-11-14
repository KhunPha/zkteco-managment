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

                // Collect punches strictly belonging to this employee's company
                List<AttendanceRawLog> empPunches = new ArrayList<>();
                String empCompany = emp.getCompanyCode() != null ? emp.getCompanyCode().trim().toLowerCase() : "default";
                for (String pin : pins) {
                    List<AttendanceRawLog> pinLogs = logsByPin.get(pin);
                    if (pinLogs != null) {
                        for (AttendanceRawLog raw : pinLogs) {
                            String rawCompany = raw.getCompanyCode() != null ? raw.getCompanyCode().trim().toLowerCase() : "default";
                            if (empCompany.equalsIgnoreCase(rawCompany)) {
                                empPunches.add(raw);
                            }
                        }
                    }
                }
                empPunches.sort(Comparator.comparing(AttendanceRawLog::getPunchTime));

                AttendanceRecord record = existingOpt.orElseGet(() -> AttendanceRecord.builder()
                        .employee(emp)
                        .attendanceDate(date)
                        .build());

                record.setShift(shift);
                if (emp.getCompanyCode() != null && !emp.getCompanyCode().isBlank()) {
                    record.setCompanyCode(emp.getCompanyCode().trim().toLowerCase());
                }

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
                    Instant lastCheckOut = tsp.s2Out != null
                            ? tsp.s2Out
                            : (tsp.s2In == null && tsp.s1Out != null ? tsp.s1Out : null);

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

                        // Early Departure for Shift 1 (Lunch break early leave) and Shift 2 (Evening early leave)
                        int s1Early = 0;
                        if (tsp.s1Out != null && shift.getBreakStart() != null) {
                            LocalTime s1OutLt = TimeUtils.toPhnomPenhLocalTime(tsp.s1Out);
                            LocalTime breakStart = shift.getBreakStart();
                            if (s1OutLt.isBefore(breakStart.minusMinutes(graceEarly))) {
                                s1Early = (int) Duration.between(s1OutLt, breakStart).toMinutes();
                            }
                        }

                        int s2Early = 0;
                        if (tsp.s2Out != null) {
                            LocalTime s2OutLt = TimeUtils.toPhnomPenhLocalTime(tsp.s2Out);
                            LocalTime shiftEnd = shift.getEndTime();
                            if (s2OutLt.isBefore(shiftEnd.minusMinutes(graceEarly))) {
                                s2Early = (int) Duration.between(s2OutLt, shiftEnd).toMinutes();
                            } else if (s2OutLt.isAfter(shiftEnd)) {
                                overtimeMinutes = (int) Duration.between(shiftEnd, s2OutLt).toMinutes();
                            }
                        } else if (tsp.s1Out != null && tsp.s2In == null && shift.getBreakStart() == null && !date.equals(LocalDate.now())) {
                            LocalTime s1OutLt = TimeUtils.toPhnomPenhLocalTime(tsp.s1Out);
                            LocalTime shiftEnd = shift.getEndTime();
                            if (s1OutLt.isBefore(shiftEnd.minusMinutes(graceEarly))) {
                                s1Early = (int) Duration.between(s1OutLt, shiftEnd).toMinutes();
                            } else if (s1OutLt.isAfter(shiftEnd)) {
                                overtimeMinutes = (int) Duration.between(shiftEnd, s1OutLt).toMinutes();
                            }
                        }

                        earlyLeaveMinutes = s1Early + s2Early;

                        // Accurate total work time across 2 shifts
                        if (tsp.s1In != null && tsp.s1Out != null && tsp.s2In != null && tsp.s2Out != null) {
                            // Staff punched in and out for both Shift 1 and Shift 2
                            long s1 = Duration.between(tsp.s1In, tsp.s1Out).toMinutes();
                            long s2 = Duration.between(tsp.s2In, tsp.s2Out).toMinutes();
                            totalWorkMinutes = (int) (Math.max(0, s1) + Math.max(0, s2));
                        } else if (tsp.s1In != null && tsp.s1Out != null && tsp.s2In != null && tsp.s2Out == null) {
                            // Staff finished Shift 1 and is currently clocked in for Shift 2 (ongoing shift)
                            long s1 = Duration.between(tsp.s1In, tsp.s1Out).toMinutes();
                            long s2 = Math.max(0, Duration.between(tsp.s2In, Instant.now()).toMinutes());
                            if (!date.equals(LocalDate.now()) && shift.getEndTime() != null) {
                                LocalTime s2InLt = TimeUtils.toPhnomPenhLocalTime(tsp.s2In);
                                if (s2InLt.isBefore(shift.getEndTime())) {
                                    s2 = Math.max(0, Duration.between(s2InLt, shift.getEndTime()).toMinutes());
                                }
                            }
                            totalWorkMinutes = (int) (Math.max(0, s1) + s2);
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

                // Collect punches strictly belonging to this student's company
                List<AttendanceRawLog> stPunches = new ArrayList<>();
                String stuCompany = st.getCompanyCode() != null ? st.getCompanyCode().trim().toLowerCase() : "default";
                for (String pin : pins) {
                    List<AttendanceRawLog> pinLogs = logsByPin.get(pin);
                    if (pinLogs != null) {
                        for (AttendanceRawLog raw : pinLogs) {
                            String rawCompany = raw.getCompanyCode() != null ? raw.getCompanyCode().trim().toLowerCase() : "default";
                            if (stuCompany.equalsIgnoreCase(rawCompany)) {
                                stPunches.add(raw);
                            }
                        }
                    }
                }
                stPunches.sort(Comparator.comparing(AttendanceRawLog::getPunchTime));

                // Determine active shift and schedule for this student
                List<EmployeeSchedule> stuSchedules = scheduleRepository.findActiveStudentSchedules(st.getId(), date);
                Shift stuShift = defaultShift;
                boolean isScheduledSchoolDay = true;

                if (!stuSchedules.isEmpty()) {
                    EmployeeSchedule schedule = stuSchedules.get(0);
                    stuShift = schedule.getShift();
                    isScheduledSchoolDay = schedule.isWorkingDay(date.getDayOfWeek());
                } else {
                    DayOfWeek dow = date.getDayOfWeek();
                    // Flexible student study schedules: Monday through Saturday active
                    isScheduledSchoolDay = (dow != DayOfWeek.SUNDAY);
                }

                // If student has punches recorded on this day, they are actively present
                if (!stPunches.isEmpty()) {
                    isScheduledSchoolDay = true;
                }

                AttendanceRecord record = existingOpt.orElseGet(() -> AttendanceRecord.builder()
                        .student(st)
                        .attendanceDate(date)
                        .build());

                record.setShift(stuShift);
                if (st.getCompanyCode() != null && !st.getCompanyCode().isBlank()) {
                    record.setCompanyCode(st.getCompanyCode().trim().toLowerCase());
                }

                if (stPunches.isEmpty()) {
                    if (isPublicHoliday) {
                        record.setStatus("HOLIDAY");
                        record.setRemarks("Official Holiday");
                    } else if (!isScheduledSchoolDay) {
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
                    TwoShiftPunches tsp = resolveTwoShiftPunches(stPunches, stuShift);
                    Instant firstCheckIn = tsp.s1In != null ? tsp.s1In : tsp.s2In;
                    Instant lastCheckOut = tsp.s2Out != null
                            ? tsp.s2Out
                            : (tsp.s2In == null && tsp.s1Out != null ? tsp.s1Out : null);

                    record.setFirstCheckIn(firstCheckIn);
                    record.setShift1CheckOut(tsp.s1Out);
                    record.setShift2CheckIn(tsp.s2In);
                    record.setShift2CheckOut(tsp.s2Out);
                    record.setLastCheckOut(lastCheckOut != null && !lastCheckOut.equals(firstCheckIn) ? lastCheckOut : null);

                    record.setInDevice(tsp.inDevice);
                    record.setOutDevice(tsp.outDevice);

                    int lateMinutes = 0;
                    int earlyLeaveMinutes = 0;
                    if (stuShift != null) {
                        int graceLate = stuShift.getGraceLateMinutes();
                        int s1Late = 0;
                        if (tsp.s1In != null) {
                            LocalTime s1InTime = TimeUtils.toPhnomPenhLocalTime(tsp.s1In);
                            LocalTime shiftStart = stuShift.getStartTime();
                            if (s1InTime.isAfter(shiftStart.plusMinutes(graceLate))) {
                                s1Late = (int) Duration.between(shiftStart, s1InTime).toMinutes();
                            }
                        }
                        int s2Late = 0;
                        if (tsp.s2In != null && stuShift.getBreakEnd() != null) {
                            LocalTime s2InTime = TimeUtils.toPhnomPenhLocalTime(tsp.s2In);
                            LocalTime s2Start = stuShift.getBreakEnd();
                            if (s2InTime.isAfter(s2Start.plusMinutes(graceLate))) {
                                s2Late = (int) Duration.between(s2Start, s2InTime).toMinutes();
                            }
                        } else if (tsp.s1In == null && tsp.s2In != null && stuShift.getBreakEnd() == null) {
                            LocalTime s2InTime = TimeUtils.toPhnomPenhLocalTime(tsp.s2In);
                            LocalTime shiftStart = stuShift.getStartTime();
                            if (s2InTime.isAfter(shiftStart.plusMinutes(graceLate))) {
                                s2Late = (int) Duration.between(shiftStart, s2InTime).toMinutes();
                            }
                        }
                        lateMinutes = s1Late + s2Late;

                        // Early Departure for Shift 1 & Shift 2
                        int graceEarly = stuShift.getGraceEarlyLeaveMinutes();
                        int s1Early = 0;
                        if (tsp.s1Out != null && stuShift.getBreakStart() != null) {
                            LocalTime s1OutLt = TimeUtils.toPhnomPenhLocalTime(tsp.s1Out);
                            LocalTime breakStart = stuShift.getBreakStart();
                            if (s1OutLt.isBefore(breakStart.minusMinutes(graceEarly))) {
                                s1Early = (int) Duration.between(s1OutLt, breakStart).toMinutes();
                            }
                        }

                        int s2Early = 0;
                        if (tsp.s2Out != null) {
                            LocalTime s2OutLt = TimeUtils.toPhnomPenhLocalTime(tsp.s2Out);
                            LocalTime shiftEnd = stuShift.getEndTime();
                            if (s2OutLt.isBefore(shiftEnd.minusMinutes(graceEarly))) {
                                s2Early = (int) Duration.between(s2OutLt, shiftEnd).toMinutes();
                            }
                        } else if (tsp.s1Out != null && tsp.s2In == null && stuShift.getBreakStart() == null && !date.equals(LocalDate.now())) {
                            LocalTime s1OutLt = TimeUtils.toPhnomPenhLocalTime(tsp.s1Out);
                            LocalTime shiftEnd = stuShift.getEndTime();
                            if (s1OutLt.isBefore(shiftEnd.minusMinutes(graceEarly))) {
                                s1Early = (int) Duration.between(s1OutLt, shiftEnd).toMinutes();
                            }
                        }

                        earlyLeaveMinutes = s1Early + s2Early;
                    }

                    record.setLateMinutes(lateMinutes);
                    record.setEarlyLeaveMinutes(earlyLeaveMinutes);
                    if (lateMinutes > 0) {
                        record.setStatus("LATE");
                    } else if (earlyLeaveMinutes > 0) {
                        record.setStatus("EARLY_DEPARTURE");
                    } else {
                        record.setStatus("PRESENT");
                    }

                    int stuWork = 0;
                    if (tsp.s1In != null && tsp.s1Out != null && tsp.s2In != null && tsp.s2Out != null) {
                        long s1 = Duration.between(tsp.s1In, tsp.s1Out).toMinutes();
                        long s2 = Duration.between(tsp.s2In, tsp.s2Out).toMinutes();
                        stuWork = (int) (Math.max(0, s1) + Math.max(0, s2));
                    } else if (tsp.s1In != null && tsp.s1Out != null && tsp.s2In != null && tsp.s2Out == null) {
                        long s1 = Duration.between(tsp.s1In, tsp.s1Out).toMinutes();
                        long s2 = Math.max(0, Duration.between(tsp.s2In, Instant.now()).toMinutes());
                        stuWork = (int) (Math.max(0, s1) + s2);
                    } else if (tsp.s1In != null && tsp.s1Out != null) {
                        stuWork = (int) Math.max(0, Duration.between(tsp.s1In, tsp.s1Out).toMinutes());
                    } else if (firstCheckIn != null && record.getLastCheckOut() != null) {
                        stuWork = (int) Math.max(0, Duration.between(firstCheckIn, record.getLastCheckOut()).toMinutes());
                    }
                    record.setTotalWorkMinutes(stuWork);
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
                AttendanceRawLog p = afternoonPunches.get(0);
                LocalTime pTime = TimeUtils.toPhnomPenhLocalTime(p.getPunchTime());
                String state = p.getPunchState() != null ? p.getPunchState().toUpperCase() : "";

                boolean isExplicitOut = "CHECK_OUT".equals(state) || "BREAK_OUT".equals(state);
                boolean isExplicitIn = "CHECK_IN".equals(state) || "BREAK_IN".equals(state);

                if (isExplicitOut) {
                    res.s2Out = p.getPunchTime();
                    res.outDevice = p.getDevice();
                } else if (isExplicitIn) {
                    res.s2In = p.getPunchTime();
                    res.inDevice = p.getDevice();
                } else {
                    // Biometric punch with unspecified or default state
                    boolean isTwoShiftWithBreak = (shift != null && shift.getBreakStart() != null && shift.getBreakEnd() != null);
                    if (isTwoShiftWithBreak) {
                        if (res.s1Out != null) {
                            // Staff already clocked out for lunch in Shift 1.
                            // This afternoon punch is returning from lunch to begin Shift 2 (Resume In).
                            res.s2In = p.getPunchTime();
                            res.inDevice = p.getDevice();
                        } else {
                            // Staff did not clock out for lunch. Determine whether this punch is returning from lunch or leaving for the day.
                            LocalTime shiftEnd = (shift.getEndTime() != null) ? shift.getEndTime() : LocalTime.of(17, 0);
                            LocalTime afternoonMidpoint = breakEnd.plusMinutes(Duration.between(breakEnd, shiftEnd).toMinutes() / 2);
                            if (pTime.isBefore(afternoonMidpoint)) {
                                // Early afternoon punch (closer to break end) -> Shift 2 Check In
                                res.s2In = p.getPunchTime();
                                res.inDevice = p.getDevice();
                            } else {
                                // Late afternoon punch (closer to shift end) -> Shift 2 Check Out
                                res.s2Out = p.getPunchTime();
                                res.outDevice = p.getDevice();
                            }
                        }
                    } else {
                        // Single shift (no lunch break)
                        if (res.s1In != null) {
                            res.s2Out = p.getPunchTime();
                            res.outDevice = p.getDevice();
                        } else {
                            res.s2In = p.getPunchTime();
                            res.inDevice = p.getDevice();
                        }
                    }
                }
            } else {
                res.s2In = afternoonPunches.get(0).getPunchTime();
                res.inDevice = afternoonPunches.get(0).getDevice();
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

