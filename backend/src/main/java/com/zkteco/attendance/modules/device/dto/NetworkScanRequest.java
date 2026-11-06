package com.zkteco.attendance.modules.device.dto;

import lombok.Data;

@Data
public class NetworkScanRequest {
    private String subnet = "192.168.1";
    private int startIp = 1;
    private int endIp = 254;
    private int port = 4370;
    private int timeoutMs = 300;
}

