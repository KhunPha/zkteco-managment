# ZKTeco Device Integration Guide

## 1. Supported Integration Protocols

This system supports direct biometric device communication without requiring proprietary ZKTeco middleman software.

### A. ADMS / PUSH Protocol (Recommended for Distributed & Cloud Deployments)
In ADMS mode, the biometric terminal initiates outbound HTTP connections to the server.

#### Endpoint Specifications:
1. **Handshake (`GET /iclock/cdata?SN={serialNumber}&options=all&pushver=2.4.0`)**:
   - Device connects on startup.
   - Server returns configuration parameters:
     ```
     GET OPTION FROM: {serialNumber}
     Stamp=9999
     OpStamp=9999
     ErrorDelay=60
     Delay=30
     TransTimes=00:00;14:00
     TransInterval=1
     TransFlag=TransData AttLog OpLog
     TimeZone=7
     Realtime=1
     Encrypt=0
     ```

2. **Data Ingestion (`POST /iclock/cdata?SN={serialNumber}&table=ATTLOG`)**:
   - Device pushes real-time or batched punch logs in tab-separated format:
     ```
     PIN\tYYYY-MM-DD HH:mm:ss\tSTATUS\tVERIFY\tWORKCODE
     ```
   - Server responds with `OK: {count}`.

3. **Command Polling (`GET /iclock/getrequest?SN={serialNumber}`)**:
   - Device polls server for pending operations.
   - If commands exist, server responds: `C:{commandId}:{command}` (e.g. `C:12:CHECK`, `C:13:REBOOT`, `C:14:SET TIME 2026-11-04 19:00:00`).
   - If no commands, server responds: `OK`.

4. **Command Feedback (`POST /iclock/devicecmd?SN={serialNumber}`)**:
   - Device reports execution result: `ID={commandId}&Return=0&CMD=SUCCESS`.

---

### B. Standalone TCP/IP Protocol (Port 4370)
Used for local intranet networks where the server pulls data directly from the terminal via raw TCP sockets.

#### Packet Framing:
```
+--------------+--------------+--------------+--------------+------------------+
| Command (2B) | Checksum (2B)| SessionId(2B)|  ReplyId(2B) | Payload (0..N B) |
+--------------+--------------+--------------+--------------+------------------+
```

#### Command Codes:
- `CMD_CONNECT (1000)`: Initialize session and obtain dynamic 16-bit session ID.
- `CMD_EXIT (1001)`: Disconnect session gracefully.
- `CMD_VERSION (1100)`: Query device firmware string.
- `CMD_GET_TIME (201)`: Query terminal real-time clock.
- `CMD_SET_TIME (202)`: Synchronize terminal clock.
- `CMD_ATTLOG_RRQ (9)`: Download attendance records.
- `CMD_USERTEMP_RRQ (8)`: Download user directory.
- `CMD_RESTART (1004)`: Reboot terminal.
- `CMD_ACK_OK (2000)`: Success acknowledgment.

---

## 2. Configuring a Physical ZKTeco Terminal

### For ADMS Push:
1. On the physical device screen, navigate to **Menu -> Comm. -> Cloud Server Server (or ADMS / Web Server)**.
2. Configure:
   - **Server Address**: IP or domain of your attendance server (e.g. `192.168.1.100` or `attendance.enterprise.edu.kh`).
   - **Server Port**: `80` (or `8080` if accessing backend directly).
   - **Enable Proxy**: `OFF`.
   - **HTTPS**: Match your domain configuration.
3. Save and reboot the device.
4. The device will appear as `ONLINE` in the dashboard after its first handshake.

### For TCP Standalone:
1. Navigate to **Menu -> Comm. -> Ethernet**.
2. Assign static IP address (e.g. `192.168.1.201`), Subnet Mask, and Gateway.
3. Ensure port `4370` is configured.
4. In the Administrative Dashboard, register the device with protocol `TCP_PULL`.

