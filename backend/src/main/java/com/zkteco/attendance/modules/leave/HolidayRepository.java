package com.zkteco.attendance.modules.leave;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface HolidayRepository extends JpaRepository<Holiday, Long> {

    Optional<Holiday> findByHolidayDate(LocalDate holidayDate);

    boolean existsByHolidayDate(LocalDate holidayDate);

    List<Holiday> findByHolidayDateBetween(LocalDate start, LocalDate end);

    @Query("SELECT CASE WHEN COUNT(h) > 0 THEN true ELSE false END FROM Holiday h WHERE " +
           "(h.endDate IS NULL AND h.holidayDate = :date) OR " +
           "(h.endDate IS NOT NULL AND :date >= h.holidayDate AND :date <= h.endDate)")
    boolean isHolidayOnDate(@Param("date") LocalDate date);

    @Query("SELECT h FROM Holiday h WHERE " +
           "(h.endDate IS NULL AND h.holidayDate = :date) OR " +
           "(h.endDate IS NOT NULL AND :date >= h.holidayDate AND :date <= h.endDate)")
    List<Holiday> findHolidaysOnDate(@Param("date") LocalDate date);

    @Query("SELECT h FROM Holiday h WHERE " +
           "(h.endDate IS NULL AND h.holidayDate BETWEEN :start AND :end) OR " +
           "(h.endDate IS NOT NULL AND h.holidayDate <= :end AND h.endDate >= :start) " +
           "ORDER BY h.holidayDate ASC")
    List<Holiday> findHolidaysInRange(@Param("start") LocalDate start, @Param("end") LocalDate end);

    List<Holiday> findAllByOrderByHolidayDateAsc();
}
