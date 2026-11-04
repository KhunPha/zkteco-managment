package com.zkteco.attendance.modules.dashboard;

import com.zkteco.attendance.common.TimeUtils;
import com.zkteco.attendance.modules.attendance.AttendanceRecord;
import com.zkteco.attendance.modules.attendance.AttendanceRecordRepository;
import com.zkteco.attendance.modules.device.DeviceRepository;
import com.zkteco.attendance.modules.leave.LeaveRequestRepository;
import com.zkteco.attendance.modules.organization.Department;
import com.zkteco.attendance.modules.organization.DepartmentRepository;
import com.zkteco.attendance.modules.personnel.EmployeeRepository;
import com.zkteco.attendance.modules.personnel.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final EmployeeRepository employeeRepository;
    private final StudentRepository studentRepository;
    private final DeviceRepository deviceRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final DepartmentRepository departmentRepository;

    @Transactional(readOnly = true)
    public DashboardSummaryDto getSummary() {
        LocalDate today = TimeUtils.todayInPhnomPenh();

        long totalEmployees = employeeRepository.countByEmploymentStatusAndDeletedAtIsNull("ACTIVE");
        long totalStudents = studentRepository.countByStatusAndDeletedAtIsNull("ACTIVE");

        long presentToday = attendanceRecordRepository.countPresentToday(today);
        long lateToday = attendanceRecordRepository.countByAttendanceDateAndStatus(today, "LATE");
        long absentToday = attendanceRecordRepository.countByAttendanceDateAndStatus(today, "ABSENT");
        long onLeaveToday = leaveRequestRepository.countEmployeesOnLeaveToday(today);

        List<AttendanceRecord> todayRecords = attendanceRecordRepository.findByAttendanceDate(today);
        long currentlyWorking = todayRecords.stream()
                .filter(r -> r.getFirstCheckIn() != null && r.getLastCheckOut() == null)
                .count();

        double attendancePercentage = totalEmployees > 0
                ? Math.round(((double) presentToday / totalEmployees) * 1000.0) / 10.0
                : 0.0;

        long devicesOnline = deviceRepository.countByConnectionStatus("ONLINE");
        long devicesOffline = deviceRepository.countByConnectionStatus("OFFLINE");

        // 7-day trend
        List<DashboardSummaryDto.DailyTrendDto> weeklyTrend = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            long p = attendanceRecordRepository.countPresentToday(d);
            long l = attendanceRecordRepository.countByAttendanceDateAndStatus(d, "LATE");
            long a = attendanceRecordRepository.countByAttendanceDateAndStatus(d, "ABSENT");

            weeklyTrend.add(DashboardSummaryDto.DailyTrendDto.builder()
                    .date(d.toString())
                    .present(p)
                    .late(l)
                    .absent(a)
                    .build());
        }

        // Department stats
        List<Department> departments = departmentRepository.findAllByActiveTrue();
        List<DashboardSummaryDto.DepartmentStatDto> deptStats = new ArrayList<>();
        for (Department dept : departments) {
            long deptEmpCount = todayRecords.stream()
                    .filter(r -> r.getEmployee() != null && r.getEmployee().getDepartment() != null && r.getEmployee().getDepartment().getId().equals(dept.getId()))
                    .count();

            long deptPresent = todayRecords.stream()
                    .filter(r -> r.getEmployee() != null && r.getEmployee().getDepartment() != null
                            && r.getEmployee().getDepartment().getId().equals(dept.getId())
                            && ("PRESENT".equalsIgnoreCase(r.getStatus()) || "LATE".equalsIgnoreCase(r.getStatus())))
                    .count();

            deptStats.add(DashboardSummaryDto.DepartmentStatDto.builder()
                    .departmentName(dept.getName())
                    .employeeCount(deptEmpCount)
                    .presentCount(deptPresent)
                    .build());
        }

        return DashboardSummaryDto.builder()
                .totalEmployees(totalEmployees)
                .totalStudents(totalStudents)
                .presentToday(presentToday)
                .absentToday(absentToday)
                .lateToday(lateToday)
                .onLeaveToday(onLeaveToday)
                .currentlyWorking(currentlyWorking)
                .attendancePercentage(attendancePercentage)
                .devicesOnline(devicesOnline)
                .devicesOffline(devicesOffline)
                .weeklyTrend(weeklyTrend)
                .departmentStats(deptStats)
                .build();
    }
}

