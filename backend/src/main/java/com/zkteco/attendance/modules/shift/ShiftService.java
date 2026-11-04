package com.zkteco.attendance.modules.shift;

import com.zkteco.attendance.common.AppException;
import com.zkteco.attendance.common.ErrorCode;
import com.zkteco.attendance.common.ResourceNotFoundException;
import com.zkteco.attendance.modules.shift.dto.CreateShiftRequest;
import com.zkteco.attendance.modules.shift.dto.ShiftDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShiftService {

    private final ShiftRepository shiftRepository;

    @Transactional(readOnly = true)
    public List<ShiftDto> getAllShifts() {
        return shiftRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ShiftDto getShiftById(Long id) {
        return toDto(shiftRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shift", "id", id)));
    }

    @Transactional
    public ShiftDto createShift(CreateShiftRequest request) {
        if (shiftRepository.existsByCode(request.getCode())) {
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Shift code already exists: " + request.getCode());
        }

        Shift shift = Shift.builder()
                .code(request.getCode().trim().toUpperCase())
                .name(request.getName().trim())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .breakStart(request.getBreakStart())
                .breakEnd(request.getBreakEnd())
                .graceLateMinutes(request.getGraceLateMinutes() != null ? request.getGraceLateMinutes() : 15)
                .graceEarlyLeaveMinutes(request.getGraceEarlyLeaveMinutes() != null ? request.getGraceEarlyLeaveMinutes() : 15)
                .workHours(request.getWorkHours() != null ? request.getWorkHours() : new BigDecimal("8.00"))
                .overnight(request.getOvernight() != null ? request.getOvernight() : false)
                .flexible(request.getFlexible() != null ? request.getFlexible() : false)
                .requiresCheckout(request.getRequiresCheckout() != null ? request.getRequiresCheckout() : true)
                .active(request.getActive() != null ? request.getActive() : true)
                .build();

        return toDto(shiftRepository.save(shift));
    }

    @Transactional
    public ShiftDto updateShift(Long id, CreateShiftRequest request) {
        Shift shift = shiftRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shift", "id", id));

        shift.setName(request.getName().trim());
        shift.setStartTime(request.getStartTime());
        shift.setEndTime(request.getEndTime());
        shift.setBreakStart(request.getBreakStart());
        shift.setBreakEnd(request.getBreakEnd());
        if (request.getGraceLateMinutes() != null) shift.setGraceLateMinutes(request.getGraceLateMinutes());
        if (request.getGraceEarlyLeaveMinutes() != null) shift.setGraceEarlyLeaveMinutes(request.getGraceEarlyLeaveMinutes());
        if (request.getWorkHours() != null) shift.setWorkHours(request.getWorkHours());
        if (request.getOvernight() != null) shift.setOvernight(request.getOvernight());
        if (request.getFlexible() != null) shift.setFlexible(request.getFlexible());
        if (request.getRequiresCheckout() != null) shift.setRequiresCheckout(request.getRequiresCheckout());
        if (request.getActive() != null) shift.setActive(request.getActive());

        return toDto(shiftRepository.save(shift));
    }

    @Transactional
    public void deleteShift(Long id) {
        shiftRepository.deleteById(id);
    }

    public ShiftDto toDto(Shift s) {
        return ShiftDto.builder()
                .id(s.getId())
                .code(s.getCode())
                .name(s.getName())
                .startTime(s.getStartTime())
                .endTime(s.getEndTime())
                .breakStart(s.getBreakStart())
                .breakEnd(s.getBreakEnd())
                .graceLateMinutes(s.getGraceLateMinutes())
                .graceEarlyLeaveMinutes(s.getGraceEarlyLeaveMinutes())
                .workHours(s.getWorkHours())
                .overnight(s.isOvernight())
                .flexible(s.isFlexible())
                .requiresCheckout(s.isRequiresCheckout())
                .active(s.isActive())
                .build();
    }
}

