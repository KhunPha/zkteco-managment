package com.zkteco.attendance.modules.attendance;

import com.zkteco.attendance.common.TimeUtils;
import com.zkteco.attendance.modules.device.AttendanceDeviceUser;
import com.zkteco.attendance.modules.device.DeviceUserRepository;
import com.zkteco.attendance.modules.leave.HolidayRepository;
import com.zkteco.attendance.modules.leave.LeaveRequest;
import com.zkteco.attendance.modules.leave.LeaveRequestRepository;
import com.zkteco.attendance.modules.personnel.Employee;
import com.zkteco.attendance.modules.personnel.EmployeeRepository;
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

        boolean isPublicHoliday = holidayRepository.existsByHolidayDate(date);

        // 3. Process each active employee
        List<Employee> employees = employeeRepository.findAll().stream()
                .filter(e -> e.getDeletedAt() == null && "ACTIVE".equalsIgnoreCase(e.getEmploymentStatus()))
                .toList();

        for (Employee emp : employees) {
            try {
                // Check if an existing manual adjustment is present
                Optional<AttendanceRecord> existingOpt = attendanceRecordRepository.findByEmployeeIdAndAttendanceDate(emp.getId(), date);
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
                List<AttendanceDeviceUser> devUsers = deviceUserRepository.findByEmployeeId(emp.getId());
                Set<String> pins = devUsers.stream().map(AttendanceDeviceUser::getDevicePin).collect(Collectors.toSet());
                // Also check if employeeCode matches PIN directly
                pins.add(emp.getEmployeeCode());

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
                    record.setLastCheckOut(null);
                    record.setTotalWorkMinutes(0);
                    record.setLateMinutes(0);
                    record.setEarlyLeaveMinutes(0);
                    record.setOvertimeMinutes(0);
                } else {
                    // Employee has punches!
                    Instant firstCheckIn = empPunches.get(0).getPunchTime();
                    Instant lastCheckOut = empPunches.get(empPunches.size() - 1).getPunchTime();

                    record.setFirstCheckIn(firstCheckIn);
                    record.setInDevice(empPunches.get(0).getDevice());

                    if (empPunches.size() > 1 && !firstCheckIn.equals(lastCheckOut)) {
                        record.setLastCheckOut(lastCheckOut);
                        record.setOutDevice(empPunches.get(empPunches.size() - 1).getDevice());
                    } else {
                        record.setLastCheckOut(null);
                    }

                    // Calculation based on shift parameters
                    int lateMinutes = 0;
                    int earlyLeaveMinutes = 0;
                    int overtimeMinutes = 0;
                    int breakMinutes = 0;
                    int totalWorkMinutes = 0;

                    if (shift != null) {
                        LocalTime inLocalTime = TimeUtils.toPhnomPenhLocalTime(firstCheckIn);
                        LocalTime shiftStart = shift.getStartTime();
                        int graceLate = shift.getGraceLateMinutes();

                        // Late Calculation
                        if (inLocalTime.isAfter(shiftStart.plusMinutes(graceLate))) {
                            lateMinutes = (int) Duration.between(shiftStart, inLocalTime).toMinutes();
                        }

                        // Early Departure & Overtime (when check-out exists)
                        if (record.getLastCheckOut() != null) {
                            LocalTime outLocalTime = TimeUtils.toPhnomPenhLocalTime(record.getLastCheckOut());
                            LocalTime shiftEnd = shift.getEndTime();
                            int graceEarly = shift.getGraceEarlyLeaveMinutes();

                            if (outLocalTime.isBefore(shiftEnd.minusMinutes(graceEarly))) {
                                earlyLeaveMinutes = (int) Duration.between(outLocalTime, shiftEnd).toMinutes();
                            } else if (outLocalTime.isAfter(shiftEnd)) {
                                overtimeMinutes = (int) Duration.between(shiftEnd, outLocalTime).toMinutes();
                            }

                            // Break deduction
                            if (shift.getBreakStart() != null && shift.getBreakEnd() != null) {
                                breakMinutes = (int) Duration.between(shift.getBreakStart(), shift.getBreakEnd()).toMinutes();
                            }

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

                attendanceRecordRepository.save(record);
                processedCount++;

            } catch (Exception ex) {
                errorCount++;
                errorDetails.append(emp.getEmployeeCode()).append(": ").append(ex.getMessage()).append("; ");
                log.error("Error calculating attendance for employee {}: {}", emp.getEmployeeCode(), ex.getMessage());
            }
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
}

