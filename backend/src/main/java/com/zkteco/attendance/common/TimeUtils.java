package com.zkteco.attendance.common;

import java.time.*;
import java.time.format.DateTimeFormatter;

public final class TimeUtils {

    public static final ZoneId PHNOM_PENH_ZONE = ZoneId.of("Asia/Phnom_Penh");
    public static final ZoneId UTC_ZONE = ZoneOffset.UTC;

    public static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    public static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");
    public static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private TimeUtils() {}

    public static ZonedDateTime nowInPhnomPenh() {
        return ZonedDateTime.now(PHNOM_PENH_ZONE);
    }

    public static LocalDate todayInPhnomPenh() {
        return LocalDate.now(PHNOM_PENH_ZONE);
    }

    public static Instant toUtcInstant(LocalDateTime localDateTime) {
        if (localDateTime == null) return null;
        return localDateTime.atZone(PHNOM_PENH_ZONE).toInstant();
    }

    public static LocalDateTime toPhnomPenhLocalDateTime(Instant instant) {
        if (instant == null) return null;
        return instant.atZone(PHNOM_PENH_ZONE).toLocalDateTime();
    }

    public static LocalTime toPhnomPenhLocalTime(Instant instant) {
        if (instant == null) return null;
        return instant.atZone(PHNOM_PENH_ZONE).toLocalTime();
    }

    public static LocalDate toPhnomPenhLocalDate(Instant instant) {
        if (instant == null) return null;
        return instant.atZone(PHNOM_PENH_ZONE).toLocalDate();
    }

    public static Instant parseDeviceTime(String timeStr) {
        if (timeStr == null || timeStr.trim().isEmpty()) return null;
        LocalDateTime ldt = LocalDateTime.parse(timeStr.trim(), DATETIME_FORMATTER);
        return ldt.atZone(PHNOM_PENH_ZONE).toInstant();
    }

    public static String formatPhnomPenh(Instant instant) {
        if (instant == null) return null;
        return toPhnomPenhLocalDateTime(instant).format(DATETIME_FORMATTER);
    }
}

