package com.zkteco.attendance.modules.leave;

import com.zkteco.attendance.common.AppException;
import com.zkteco.attendance.common.ErrorCode;
import com.zkteco.attendance.modules.leave.dto.CreateHolidayRequest;
import com.zkteco.attendance.modules.leave.dto.HolidayDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class HolidayService {

    private final HolidayRepository holidayRepository;

    @Transactional(readOnly = true)
    public List<HolidayDto> getAllHolidays() {
        return holidayRepository.findAllByOrderByHolidayDateAsc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<HolidayDto> getHolidaysInRange(LocalDate start, LocalDate end) {
        return holidayRepository.findHolidaysInRange(start, end).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public HolidayDto createHoliday(CreateHolidayRequest request) {
        LocalDate startDate = request.getHolidayDate();
        LocalDate endDate = request.getEndDate();

        if (endDate != null) {
            if (endDate.isBefore(startDate)) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Holiday end date cannot be earlier than start date");
            }
            // If end date is equal to start date, normalize to null
            if (endDate.isEqual(startDate)) {
                endDate = null;
            }
        }

        Holiday h = Holiday.builder()
                .name(request.getName().trim())
                .holidayDate(startDate)
                .endDate(endDate)
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

    /**
     * Seed standard Cambodian Official Public Holidays for the specified year
     */
    @Transactional
    public List<HolidayDto> seedCambodianHolidays(int year) {
        List<HolidayDto> seeded = new ArrayList<>();

        // 1. International New Year (1 Jan)
        addIfAbsent("International New Year (ទិវាចូលឆ្នាំសកល)", LocalDate.of(year, 1, 1), null, true, seeded);

        // 2. Victory over Genocide Day (7 Jan)
        addIfAbsent("Victory over Genocide Day (ទិវាជ័យជម្នះលើរបបប្រល័យពូជសាសន៍)", LocalDate.of(year, 1, 7), null, true, seeded);

        // 3. International Women's Day (8 Mar)
        addIfAbsent("International Women's Day (ទិវានារីអន្តរជាតិ)", LocalDate.of(year, 3, 8), null, true, seeded);

        // 4. Khmer New Year (ពិធីបុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិខ្មែរ - 3 Days)
        addIfAbsent("Khmer New Year (ពិធីបុណ្យចូលឆ្នាំខ្មែរ)", LocalDate.of(year, 4, 14), LocalDate.of(year, 4, 16), false, seeded);

        // 5. International Labor Day (1 May)
        addIfAbsent("International Labor Day (ទិវាពលកម្មអន្តរជាតិ)", LocalDate.of(year, 5, 1), null, true, seeded);

        // 6. King Norodom Sihamoni's Birthday (14 May)
        addIfAbsent("King Norodom Sihamoni's Birthday (ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម ព្រះមហាក្សត្រ)", LocalDate.of(year, 5, 14), null, true, seeded);

        // 7. National Day of Remembrance (20 May)
        addIfAbsent("National Day of Remembrance (ទិវាជាតិនៃការចងចាំ)", LocalDate.of(year, 5, 20), null, true, seeded);

        // 8. Pchum Ben Festival (ពិធីបុណ្យភ្ជុំបិណ្ឌ - 3 Days, typically late Sep / early Oct)
        addIfAbsent("Pchum Ben Festival (ពិធីបុណ្យភ្ជុំបិណ្ឌ)", LocalDate.of(year, 9, 21), LocalDate.of(year, 9, 23), false, seeded);

        // 9. Constitutional Day (24 Sep)
        addIfAbsent("Constitutional Day (ទិវាប្រកាសរដ្ឋធម្មនុញ្ញ)", LocalDate.of(year, 9, 24), null, true, seeded);

        // 10. Commemoration Day of the King's Father (15 Oct)
        addIfAbsent("Commemoration Day of King's Father (ទិវាប្រារព្ធពិធីគោរពព្រះវិញ្ញាណក្ខន្ធ ព្រះបរមរតនកោដ្ឋ)", LocalDate.of(year, 10, 15), null, true, seeded);

        // 11. National Independence Day (9 Nov)
        addIfAbsent("National Independence Day (ទិវាបុណ្យឯករាជ្យជាតិ)", LocalDate.of(year, 11, 9), null, true, seeded);

        // 12. Water and Moon Festival (ពិធីបុណ្យអុំទូក បណ្តែតប្រទីប និងសំពះព្រះខែ - 3 Days, typically Nov)
        addIfAbsent("Water Festival (ពិធីបុណ្យអុំទូក បណ្ដែតប្រទីប និងអកអំបុក)", LocalDate.of(year, 11, 24), LocalDate.of(year, 11, 26), false, seeded);

        return seeded;
    }

    private void addIfAbsent(String name, LocalDate start, LocalDate end, boolean recurring, List<HolidayDto> seeded) {
        boolean exists = holidayRepository.findAll().stream().anyMatch(h ->
                h.getHolidayDate().equals(start) || (h.getName() != null && h.getName().toLowerCase().contains(name.substring(0, Math.min(10, name.length())).toLowerCase()))
        );
        if (!exists) {
            Holiday h = Holiday.builder()
                    .name(name)
                    .holidayDate(start)
                    .endDate(end)
                    .recurring(recurring)
                    .affectsTeachers(true)
                    .affectsStudents(true)
                    .build();
            seeded.add(toDto(holidayRepository.save(h)));
            log.info("Seeded Cambodian holiday: {} from {} to {}", name, start, end);
        }
    }

    private HolidayDto toDto(Holiday h) {
        int days = 1;
        if (h.getEndDate() != null && !h.getEndDate().isBefore(h.getHolidayDate())) {
            days = (int) ChronoUnit.DAYS.between(h.getHolidayDate(), h.getEndDate()) + 1;
        }

        return HolidayDto.builder()
                .id(h.getId())
                .name(h.getName())
                .holidayDate(h.getHolidayDate())
                .endDate(h.getEndDate())
                .daysCount(days)
                .recurring(h.isRecurring())
                .affectsTeachers(h.isAffectsTeachers())
                .affectsStudents(h.isAffectsStudents())
                .build();
    }
}
