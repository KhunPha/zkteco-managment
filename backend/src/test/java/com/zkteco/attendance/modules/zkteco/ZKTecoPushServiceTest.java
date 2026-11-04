package com.zkteco.attendance.modules.zkteco;

import com.zkteco.attendance.modules.attendance.AttendanceRawLog;
import com.zkteco.attendance.modules.attendance.AttendanceRawLogRepository;
import com.zkteco.attendance.modules.device.AttendanceDevice;
import com.zkteco.attendance.modules.device.DeviceCommandRepository;
import com.zkteco.attendance.modules.device.DeviceRepository;
import com.zkteco.attendance.modules.device.DeviceSyncLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ZKTecoPushServiceTest {

    @Mock
    private DeviceRepository deviceRepository;
    @Mock
    private DeviceCommandRepository commandRepository;
    @Mock
    private AttendanceRawLogRepository rawLogRepository;
    @Mock
    private DeviceSyncLogRepository syncLogRepository;

    @InjectMocks
    private ZKTecoPushService pushService;

    private AttendanceDevice testDevice;

    @BeforeEach
    void setUp() {
        testDevice = AttendanceDevice.builder()
                .id(1L)
                .name("ADMS Test Terminal")
                .serialNumber("ZK-ADMS-999")
                .connectionStatus("OFFLINE")
                .build();
    }

    @Test
    void testHandleHandshake_ReturnsValidConfig() {
        when(deviceRepository.findBySerialNumber("ZK-ADMS-999")).thenReturn(Optional.of(testDevice));
        when(deviceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String response = pushService.handleHandshake("ZK-ADMS-999", "all", "2.4.0");

        assertNotNull(response);
        assertTrue(response.contains("GET OPTION FROM: ZK-ADMS-999"));
        assertTrue(response.contains("TransFlag=TransData AttLog OpLog"));
        assertEquals("ONLINE", testDevice.getConnectionStatus());
    }

    @Test
    void testHandlePushData_IngestsValidRecords() {
        when(deviceRepository.findBySerialNumber("ZK-ADMS-999")).thenReturn(Optional.of(testDevice));
        when(deviceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(rawLogRepository.existsByIdempotencyKey(anyString())).thenReturn(false);

        String sampleAttLog = "101\t2026-11-04 08:00:15\t0\t1\t0\n102\t2026-11-04 08:02:30\t0\t1\t0\n";
        String response = pushService.handlePushData("ZK-ADMS-999", "ATTLOG", sampleAttLog);

        assertEquals("OK: 2", response);
        verify(rawLogRepository, times(2)).save(any(AttendanceRawLog.class));
    }

    @Test
    void testHandlePushData_DeduplicatesExistingKeys() {
        when(deviceRepository.findBySerialNumber("ZK-ADMS-999")).thenReturn(Optional.of(testDevice));
        when(deviceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(rawLogRepository.existsByIdempotencyKey(anyString())).thenReturn(true); // Already ingested

        String sampleAttLog = "101\t2026-11-04 08:00:15\t0\t1\t0\n";
        String response = pushService.handlePushData("ZK-ADMS-999", "ATTLOG", sampleAttLog);

        assertEquals("OK: 0", response);
        verify(rawLogRepository, never()).save(any(AttendanceRawLog.class));
    }
}

