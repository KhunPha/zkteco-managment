package com.zkteco.attendance.modules.leave;

import com.zkteco.attendance.common.AppException;
import com.zkteco.attendance.common.ErrorCode;
import com.zkteco.attendance.common.ResourceNotFoundException;
import com.zkteco.attendance.modules.leave.dto.CreateHolidayRequest;
import com.zkteco.attendance.modules.leave.dto.HolidayDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HolidayService {

    private final HolidayRepository holidayRepository;

    @Transactional(readOnly = true)
    public List<HolidayDto> getAllHolidays() {
        return holidayRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<HolidayDto> getHolidaysInRange(LocalDate start, LocalDate end) {
        return holidayRepository.findByHolidayDateBetween(start, end).stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public HolidayDto createHoliday(CreateHolidayRequest request) {
        if (holidayRepository.existsByHolidayDate(request.getHolidayDate())) {
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Holiday already configured for date: " + request.getHolidayDate());
        }

        Holiday h = Holiday.builder()
                .name(request.getName().trim())
                .holidayDate(request.getHolidayDate())
                .recurring(request.getRecurring() != null ? request.getRecurring() : false)
                .affectsTeachers(request.getAffectsTeachers() != null ? request.getAffectsTeachers() : true)
                .affectsStudents(request.getAffectsStudents() != null ? request.getAffectsStudents() : true)
                .build();

        return toDto(holidayRepository.save(h));
    }

    @Transactional
    public void deleteHoliday(Long id) {
        holidayRepository.deleteById(id);
    }

    private HolidayDto toDto(Holiday h) {
        return HolidayDto.builder()
                .id(h.getId())
                .name(h.getName())
                .holidayDate(h.getHolidayDate())
                .recurring(h.isRecurring())
                .affectsTeachers(h.isAffectsTeachers())
                .affectsStudents(h.isAffectsStudents())
                .build();
    }
}

