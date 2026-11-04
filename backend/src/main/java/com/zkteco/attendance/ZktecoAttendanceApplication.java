package com.zkteco.attendance;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@SpringBootApplication
@EnableScheduling
@EnableCaching
public class ZktecoAttendanceApplication {

    public static void main(String[] args) {
        // Enforce UTC globally for application runtime and database persistence
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        SpringApplication.run(ZktecoAttendanceApplication.class, args);
    }
}

