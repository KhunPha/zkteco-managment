package com.zkteco.attendance.modules.attendance.event;

import com.zkteco.attendance.modules.attendance.AttendanceRawLog;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class RawPunchEvent extends ApplicationEvent {

    private final AttendanceRawLog rawLog;

    public RawPunchEvent(Object source, AttendanceRawLog rawLog) {
        super(source);
        this.rawLog = rawLog;
    }
}

