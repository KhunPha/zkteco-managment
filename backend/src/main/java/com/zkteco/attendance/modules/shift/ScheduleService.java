package com.zkteco.attendance.modules.shift;

import com.zkteco.attendance.common.ResourceNotFoundException;
import com.zkteco.attendance.modules.personnel.Employee;
import com.zkteco.attendance.modules.personnel.EmployeeRepository;
import com.zkteco.attendance.modules.shift.dto.AssignScheduleRequest;
import com.zkteco.attendance.modules.shift.dto.ScheduleDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScheduleService {

    private final EmployeeScheduleRepository scheduleRepository;
    private final EmployeeRepository employeeRepository;
    private final ShiftRepository shiftRepository;

    @Transactional(readOnly = true)
    public List<ScheduleDto> getSchedulesByEmployee(Long employeeId) {
        return scheduleRepository.findByEmployeeId(employeeId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ScheduleDto> getAllSchedules() {
        return scheduleRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ScheduleDto assignSchedule(AssignScheduleRequest request) {
        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", request.getEmployeeId()));

        Shift shift = shiftRepository.findById(request.getShiftId())
                .orElseThrow(() -> new ResourceNotFoundException("Shift", "id", request.getShiftId()));

        EmployeeSchedule schedule = EmployeeSchedule.builder()
                .employee(employee)
                .shift(shift)
                .effectiveFrom(request.getEffectiveFrom())
                .effectiveTo(request.getEffectiveTo())
                .monday(request.getMonday() != null ? request.getMonday() : true)
                .tuesday(request.getTuesday() != null ? request.getTuesday() : true)
                .wednesday(request.getWednesday() != null ? request.getWednesday() : true)
                .thursday(request.getThursday() != null ? request.getThursday() : true)
                .friday(request.getFriday() != null ? request.getFriday() : true)
                .saturday(request.getSaturday() != null ? request.getSaturday() : false)
                .sunday(request.getSunday() != null ? request.getSunday() : false)
                .build();

        return toDto(scheduleRepository.save(schedule));
    }

    @Transactional
    public void deleteSchedule(Long id) {
        scheduleRepository.deleteById(id);
    }

    private ScheduleDto toDto(EmployeeSchedule s) {
        return ScheduleDto.builder()
                .id(s.getId())
                .employeeId(s.getEmployee().getId())
                .employeeCode(s.getEmployee().getEmployeeCode())
                .employeeName(s.getEmployee().getEnglishName())
                .shiftId(s.getShift().getId())
                .shiftName(s.getShift().getName())
                .effectiveFrom(s.getEffectiveFrom())
                .effectiveTo(s.getEffectiveTo())
                .monday(s.isMonday())
                .tuesday(s.isTuesday())
                .wednesday(s.isWednesday())
                .thursday(s.isThursday())
                .friday(s.isFriday())
                .saturday(s.isSaturday())
                .sunday(s.isSunday())
                .build();
    }
}

