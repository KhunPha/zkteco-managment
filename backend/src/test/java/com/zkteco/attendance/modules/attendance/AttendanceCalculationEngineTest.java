package com.zkteco.attendance.modules.attendance;

import com.zkteco.attendance.common.TimeUtils;
import com.zkteco.attendance.modules.device.AttendanceDevice;
import com.zkteco.attendance.modules.device.AttendanceDeviceUser;
import com.zkteco.attendance.modules.device.DeviceUserRepository;
import com.zkteco.attendance.modules.leave.HolidayRepository;
import com.zkteco.attendance.modules.leave.LeaveRequestRepository;
import com.zkteco.attendance.modules.personnel.Employee;
import com.zkteco.attendance.modules.personnel.EmployeeRepository;
import com.zkteco.attendance.modules.shift.EmployeeSchedule;
import com.zkteco.attendance.modules.shift.EmployeeScheduleRepository;
import com.zkteco.attendance.modules.shift.Shift;
import com.zkteco.attendance.modules.shift.ShiftRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AttendanceCalculationEngineTest {

    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private EmployeeScheduleRepository scheduleRepository;
    @Mock
    private ShiftRepository shiftRepository;
    @Mock
    private DeviceUserRepository deviceUserRepository;
    @Mock
    private AttendanceRawLogRepository rawLogRepository;
    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;
    @Mock
    private AttendanceProcessingLogRepository processingLogRepository;
    @Mock
    private HolidayRepository holidayRepository;
    @Mock
    private LeaveRequestRepository leaveRequestRepository;
    @Mock
    private com.zkteco.attendance.modules.personnel.StudentRepository studentRepository;
    @Mock
    private com.zkteco.attendance.modules.biometric.FaceBiometricRepository faceBiometricRepository;

    @InjectMocks
    private AttendanceCalculationEngine calculationEngine;

    private Employee employee;
    private Shift shift;
    private AttendanceDevice device;

    @BeforeEach
    void setUp() {
        employee = Employee.builder()
                .id(1L)
                .employeeCode("EMP001")
                .englishName("John Doe")
                .employmentStatus("ACTIVE")
                .build();

        shift = Shift.builder()
                .id(1L)
                .code("SHIFT_MORNING")
                .name("Morning Shift")
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(17, 0))
                .breakStart(LocalTime.of(12, 0))
                .breakEnd(LocalTime.of(13, 0))
                .graceLateMinutes(15)
                .graceEarlyLeaveMinutes(15)
                .workHours(new BigDecimal("8.0"))
                .build();

        device = AttendanceDevice.builder()
                .id(1L)
                .name("Main Entrance")
                .serialNumber("ZK-PP-001")
                .build();

        when(studentRepository.findAll()).thenReturn(Collections.emptyList());
    }

    @Test
    void testProcessAttendance_OnTimePresent() {
        LocalDate date = LocalDate.of(2026, 11, 4); // Wednesday
        when(employeeRepository.findAll()).thenReturn(List.of(employee));
        when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDate(1L, date)).thenReturn(Optional.empty());
        when(shiftRepository.findByCode("SHIFT_MORNING")).thenReturn(Optional.of(shift));
        when(holidayRepository.isHolidayOnDate(date)).thenReturn(false);
        when(holidayRepository.existsByHolidayDate(date)).thenReturn(false);
        when(leaveRequestRepository.findApprovedLeavesOnDate(1L, date)).thenReturn(Collections.emptyList());
        when(scheduleRepository.findActiveSchedules(1L, date)).thenReturn(Collections.emptyList());
        when(deviceUserRepository.findByEmployeeId(1L)).thenReturn(Collections.emptyList());

        // Punch in: 08:05, Punch out: 17:05
        Instant punchIn = TimeUtils.toUtcInstant(LocalDateTime.of(2026, 11, 4, 8, 5));
        Instant punchOut = TimeUtils.toUtcInstant(LocalDateTime.of(2026, 11, 4, 17, 5));

        AttendanceRawLog inLog = AttendanceRawLog.builder()
                .device(device)
                .devicePin("EMP001")
                .punchTime(punchIn)
                .build();
        AttendanceRawLog outLog = AttendanceRawLog.builder()
                .device(device)
                .devicePin("EMP001")
                .punchTime(punchOut)
                .build();

        when(rawLogRepository.findByPunchTimeBetweenOrderByPunchTimeAsc(any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(inLog, outLog));
        when(processingLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AttendanceProcessingLog result = calculationEngine.processAttendanceForDate(date);

        assertNotNull(result);
        assertEquals(2, result.getTotalRawLogs());
        assertEquals(1, result.getTotalProcessed());
        assertEquals(0, result.getTotalErrors());

        verify(attendanceRecordRepository).saveAll(argThat(records -> {
            AttendanceRecord record = records.iterator().next();
            assertEquals("PRESENT", record.getStatus());
            assertEquals(0, record.getLateMinutes());
            return true;
        }));
    }

    @Test
    void testProcessAttendance_LateArrival() {
        LocalDate date = LocalDate.of(2026, 11, 4);
        when(employeeRepository.findAll()).thenReturn(List.of(employee));
        when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDate(1L, date)).thenReturn(Optional.empty());
        when(shiftRepository.findByCode("SHIFT_MORNING")).thenReturn(Optional.of(shift));
        when(holidayRepository.isHolidayOnDate(date)).thenReturn(false);
        when(holidayRepository.existsByHolidayDate(date)).thenReturn(false);
        when(leaveRequestRepository.findApprovedLeavesOnDate(1L, date)).thenReturn(Collections.emptyList());
        when(scheduleRepository.findActiveSchedules(1L, date)).thenReturn(Collections.emptyList());
        when(deviceUserRepository.findByEmployeeId(1L)).thenReturn(Collections.emptyList());

        // Punch in at 08:30 (Late by 30 mins because grace is 15 mins)
        Instant punchIn = TimeUtils.toUtcInstant(LocalDateTime.of(2026, 11, 4, 8, 30));
        Instant punchOut = TimeUtils.toUtcInstant(LocalDateTime.of(2026, 11, 4, 17, 0));

        AttendanceRawLog inLog = AttendanceRawLog.builder()
                .device(device)
                .devicePin("EMP001")
                .punchTime(punchIn)
                .build();
        AttendanceRawLog outLog = AttendanceRawLog.builder()
                .device(device)
                .devicePin("EMP001")
                .punchTime(punchOut)
                .build();

        when(rawLogRepository.findByPunchTimeBetweenOrderByPunchTimeAsc(any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(inLog, outLog));
        when(processingLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        calculationEngine.processAttendanceForDate(date);

        verify(attendanceRecordRepository).saveAll(argThat(records -> {
            AttendanceRecord record = records.iterator().next();
            assertEquals("LATE", record.getStatus());
            assertEquals(30, record.getLateMinutes());
            return true;
        }));
    }

    @Test
    void testProcessAttendance_AbsentWhenNoPunchesOnWorkday() {
        LocalDate date = LocalDate.of(2026, 11, 4); // Wednesday
        when(employeeRepository.findAll()).thenReturn(List.of(employee));
        when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDate(1L, date)).thenReturn(Optional.empty());
        when(shiftRepository.findByCode("SHIFT_MORNING")).thenReturn(Optional.of(shift));
        when(holidayRepository.isHolidayOnDate(date)).thenReturn(false);
        when(holidayRepository.existsByHolidayDate(date)).thenReturn(false);
        when(leaveRequestRepository.findApprovedLeavesOnDate(1L, date)).thenReturn(Collections.emptyList());
        when(scheduleRepository.findActiveSchedules(1L, date)).thenReturn(Collections.emptyList());
        when(deviceUserRepository.findByEmployeeId(1L)).thenReturn(Collections.emptyList());

        when(rawLogRepository.findByPunchTimeBetweenOrderByPunchTimeAsc(any(Instant.class), any(Instant.class)))
                .thenReturn(Collections.emptyList());
        when(processingLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        calculationEngine.processAttendanceForDate(date);

        verify(attendanceRecordRepository).saveAll(argThat(records -> {
            AttendanceRecord record = records.iterator().next();
            assertEquals("ABSENT", record.getStatus());
            assertNull(record.getFirstCheckIn());
            return true;
        }));
    }

    @Test
    void testProcessAttendance_TwoShiftBothLate() {
        LocalDate date = LocalDate.of(2026, 11, 4);
        Shift twoShift = Shift.builder()
                .code("SHIFT_MORNING_BREAK")
                .name("Standard 8-Hour Full Shift")
                .startTime(LocalTime.of(7, 0))
                .breakStart(LocalTime.of(12, 0))
                .breakEnd(LocalTime.of(14, 0))
                .endTime(LocalTime.of(17, 0))
                .graceLateMinutes(10)
                .graceEarlyLeaveMinutes(15)
                .build();

        when(employeeRepository.findAll()).thenReturn(List.of(employee));
        when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDate(1L, date)).thenReturn(Optional.empty());
        when(shiftRepository.findByCode("SHIFT_MORNING")).thenReturn(Optional.of(twoShift));
        when(holidayRepository.isHolidayOnDate(date)).thenReturn(false);
        when(holidayRepository.existsByHolidayDate(date)).thenReturn(false);
        when(leaveRequestRepository.findApprovedLeavesOnDate(1L, date)).thenReturn(Collections.emptyList());
        when(scheduleRepository.findActiveSchedules(1L, date)).thenReturn(Collections.emptyList());
        when(deviceUserRepository.findByEmployeeId(1L)).thenReturn(Collections.emptyList());

        // Shift 1: In 07:32 (32m late), Out 12:04
        Instant s1In = TimeUtils.toUtcInstant(LocalDateTime.of(2026, 11, 4, 7, 32));
        Instant s1Out = TimeUtils.toUtcInstant(LocalDateTime.of(2026, 11, 4, 12, 4));
        // Shift 2: In 14:21 (21m late), Out 17:00
        Instant s2In = TimeUtils.toUtcInstant(LocalDateTime.of(2026, 11, 4, 14, 21));
        Instant s2Out = TimeUtils.toUtcInstant(LocalDateTime.of(2026, 11, 4, 17, 0));

        AttendanceRawLog log1 = AttendanceRawLog.builder().device(device).devicePin("EMP001").punchTime(s1In).punchState("CHECK_IN").build();
        AttendanceRawLog log2 = AttendanceRawLog.builder().device(device).devicePin("EMP001").punchTime(s1Out).punchState("CHECK_OUT").build();
        AttendanceRawLog log3 = AttendanceRawLog.builder().device(device).devicePin("EMP001").punchTime(s2In).punchState("CHECK_IN").build();
        AttendanceRawLog log4 = AttendanceRawLog.builder().device(device).devicePin("EMP001").punchTime(s2Out).punchState("CHECK_OUT").build();

        when(rawLogRepository.findByPunchTimeBetweenOrderByPunchTimeAsc(any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(log1, log2, log3, log4));
        when(processingLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        calculationEngine.processAttendanceForDate(date);

        verify(attendanceRecordRepository).saveAll(argThat(records -> {
            AttendanceRecord record = records.iterator().next();
            assertEquals("LATE", record.getStatus());
            // Shift 1 late (32m) + Shift 2 late (21m) = 53m
            assertEquals(53, record.getLateMinutes());
            return true;
        }));
    }
}

