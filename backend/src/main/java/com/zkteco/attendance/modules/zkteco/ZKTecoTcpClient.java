package com.zkteco.attendance.modules.zkteco;

import com.zkteco.attendance.common.TimeUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Slf4j
@Component
public class ZKTecoTcpClient implements BiometricDeviceClient {

    private static final int TIMEOUT_MS = 5000;

    // Standard ZKTeco command constants
    private static final int CMD_CONNECT = 1000;
    private static final int CMD_EXIT = 1001;
    private static final int CMD_ENABLEDEVICE = 1002;
    private static final int CMD_DISABLEDEVICE = 1003;
    private static final int CMD_RESTART = 1004;
    private static final int CMD_GET_TIME = 201;
    private static final int CMD_SET_TIME = 202;
    private static final int CMD_VERSION = 1100;
    private static final int CMD_DEVICE_INFO = 11;
    private static final int CMD_ATTLOG_RRQ = 9;
    private static final int CMD_USERTEMP_RRQ = 8;
    private static final int CMD_ACK_OK = 2000;

    private static final int USHRT_MAX = 65535;

    private String resolveHost(String ipAddress, int port) {
        if ("127.0.0.1".equals(ipAddress) || "localhost".equalsIgnoreCase(ipAddress)) {
            try (Socket s = new Socket()) {
                s.connect(new InetSocketAddress("127.0.0.1", port), 300);
                return "127.0.0.1";
            } catch (Exception ignored) {
                return "host.docker.internal";
            }
        }
        return ipAddress;
    }

    @Override
    public boolean testConnection(String ipAddress, int port, String commKey) {
        if (ipAddress == null || ipAddress.trim().isEmpty()) return false;
        String host = resolveHost(ipAddress, port);
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), TIMEOUT_MS);
            socket.setSoTimeout(TIMEOUT_MS);

            Session session = connectSession(socket, commKey);
            if (session.sessionId != 0) {
                disconnectSession(socket, session);
                return true;
            }
            return false;
        } catch (Exception ex) {
            log.warn("TCP Connection test failed for {}:{}: {}", host, port, ex.getMessage());
            return false;
        }
    }

    @Override
    public DeviceInfo getDeviceInfo(String ipAddress, int port, String commKey) {
        if (ipAddress == null) return null;
        String host = resolveHost(ipAddress, port);
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), TIMEOUT_MS);
            socket.setSoTimeout(TIMEOUT_MS);

            Session session = connectSession(socket, commKey);
            if (session.sessionId == 0) return null;

            // Get firmware version
            byte[] verResp = sendCommand(socket, session, CMD_VERSION, new byte[0]);
            String firmwareVersion = extractStringFromPayload(verResp);

            // Get device time
            Instant deviceTime = getDeviceTimeFromSession(socket, session);

            disconnectSession(socket, session);

            return DeviceInfo.builder()
                    .model("ZKTeco Standalone")
                    .firmwareVersion(firmwareVersion != null ? firmwareVersion : "Ver 1.0.0")
                    .deviceTime(deviceTime != null ? deviceTime : Instant.now())
                    .build();
        } catch (Exception ex) {
            log.error("Failed to get device info from {}:{}: {}", host, port, ex.getMessage());
            return null;
        }
    }

    @Override
    public Instant getDeviceTime(String ipAddress, int port, String commKey) {
        String host = resolveHost(ipAddress, port);
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), TIMEOUT_MS);
            socket.setSoTimeout(TIMEOUT_MS);

            Session session = connectSession(socket, commKey);
            if (session.sessionId == 0) return Instant.now();

            Instant time = getDeviceTimeFromSession(socket, session);
            disconnectSession(socket, session);
            return time;
        } catch (Exception ex) {
            log.error("Failed to read device time from {}:{}: {}", host, port, ex.getMessage());
            return Instant.now();
        }
    }

    @Override
    public boolean syncDeviceTime(String ipAddress, int port, String commKey, Instant targetTime) {
        String host = resolveHost(ipAddress, port);
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), TIMEOUT_MS);
            socket.setSoTimeout(TIMEOUT_MS);

            Session session = connectSession(socket, commKey);
            if (session.sessionId == 0) return false;

            LocalDateTime ldt = TimeUtils.toPhnomPenhLocalDateTime(targetTime != null ? targetTime : Instant.now());
            int encodedTime = encodeTime(ldt);

            ByteBuffer buffer = ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN);
            buffer.putInt(encodedTime);

            byte[] resp = sendCommand(socket, session, CMD_SET_TIME, buffer.array());
            disconnectSession(socket, session);

            return getResponseCode(resp) == CMD_ACK_OK;
        } catch (Exception ex) {
            log.error("Failed to sync device time for {}:{}: {}", host, port, ex.getMessage());
            return false;
        }
    }

    @Override
    public List<RawAttendanceRecord> getAttendanceRecords(String ipAddress, int port, String commKey, String serialNumber) {
        String host = resolveHost(ipAddress, port);
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), TIMEOUT_MS);
            socket.setSoTimeout(TIMEOUT_MS);

            Session session = connectSession(socket, commKey);
            if (session.sessionId == 0) return Collections.emptyList();

            // Request attendance logs
            byte[] resp = sendCommand(socket, session, CMD_ATTLOG_RRQ, new byte[0]);
            List<RawAttendanceRecord> records = parseAttendanceLogs(resp, serialNumber);

            disconnectSession(socket, session);
            return records;
        } catch (Exception ex) {
            log.error("Failed to download attendance logs from {}:{}: {}", host, port, ex.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    public List<RawDeviceUser> getDeviceUsers(String ipAddress, int port, String commKey) {
        String host = resolveHost(ipAddress, port);
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), TIMEOUT_MS);
            socket.setSoTimeout(TIMEOUT_MS);

            Session session = connectSession(socket, commKey);
            if (session.sessionId == 0) return Collections.emptyList();

            // Request user table
            byte[] resp = sendCommand(socket, session, CMD_USERTEMP_RRQ, new byte[]{0x05});
            List<RawDeviceUser> users = parseUserRecords(resp);

            disconnectSession(socket, session);
            return users;
        } catch (Exception ex) {
            log.error("Failed to download users from {}:{}: {}", host, port, ex.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    public boolean setUserInfo(String ipAddress, int port, String commKey,
                               String pin, String name, String password, String privilege, String cardNumber) {
        if (ipAddress == null || ipAddress.trim().isEmpty()) return false;
        String host = resolveHost(ipAddress, port);
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), TIMEOUT_MS);
            socket.setSoTimeout(TIMEOUT_MS);

            Session session = connectSession(socket, commKey);
            if (session.sessionId == 0) return false;

            // ZKTeco CMD_USER_WRQ = 72
            // 72 bytes user packet structure:
            // offset 0: 2 bytes pin (short)
            // offset 2: 1 byte privilege (0=user, 14=admin)
            // offset 3: 8 bytes password
            // offset 11: 24 bytes name
            // offset 35: 4 bytes card number
            byte[] userPayload = new byte[72];
            ByteBuffer bb = ByteBuffer.wrap(userPayload).order(ByteOrder.LITTLE_ENDIAN);

            int pinNum = 0;
            try {
                pinNum = Integer.parseInt(pin.replaceAll("\\D+", ""));
            } catch (Exception ignored) {}
            bb.putShort((short) (pinNum & 0xFFFF));

            int priv = "ADMIN".equalsIgnoreCase(privilege) || "SUPER_ADMIN".equalsIgnoreCase(privilege) ? 14 : 0;
            bb.put(2, (byte) priv);

            if (password != null) {
                byte[] pwdBytes = password.getBytes(java.nio.charset.StandardCharsets.US_ASCII);
                System.arraycopy(pwdBytes, 0, userPayload, 3, Math.min(pwdBytes.length, 8));
            }

            if (name != null) {
                byte[] nameBytes = name.getBytes(java.nio.charset.StandardCharsets.UTF_8);
                System.arraycopy(nameBytes, 0, userPayload, 11, Math.min(nameBytes.length, 24));
            }

            if (cardNumber != null && !cardNumber.isBlank()) {
                try {
                    long card = Long.parseLong(cardNumber.trim());
                    bb.putInt(35, (int) card);
                } catch (Exception ignored) {}
            }

            byte[] resp = sendCommand(socket, session, 72, userPayload);
            // Refresh data: CMD_REFRESHDATA = 1013
            sendCommand(socket, session, 1013, new byte[0]);

            disconnectSession(socket, session);
            return getResponseCode(resp) == CMD_ACK_OK;
        } catch (Exception ex) {
            log.error("Failed to set user info on {}:{}: {}", host, port, ex.getMessage());
            return false;
        }
    }

    @Override
    public boolean restartDevice(String ipAddress, int port, String commKey) {
        String host = resolveHost(ipAddress, port);
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), TIMEOUT_MS);
            socket.setSoTimeout(TIMEOUT_MS);

            Session session = connectSession(socket, commKey);
            if (session.sessionId == 0) return false;

            byte[] resp = sendCommand(socket, session, CMD_RESTART, new byte[0]);
            disconnectSession(socket, session);
            return getResponseCode(resp) == CMD_ACK_OK;
        } catch (Exception ex) {
            log.error("Failed to restart device {}:{}: {}", host, port, ex.getMessage());
            return false;
        }
    }

    // Protocol Internal Helpers

    private static class Session {
        int sessionId = 0;
        int replyId = 0;
    }

    private Session connectSession(Socket socket, String commKey) throws Exception {
        Session session = new Session();
        byte[] payload = new byte[0];

        byte[] request = createPacket(CMD_CONNECT, 0, 0, payload);
        OutputStream out = socket.getOutputStream();
        out.write(request);
        out.flush();

        byte[] response = readResponse(socket.getInputStream());
        if (response != null && response.length >= 8) {
            int code = getResponseCode(response);
            if (code == CMD_ACK_OK) {
                ByteBuffer bb = ByteBuffer.wrap(response).order(ByteOrder.LITTLE_ENDIAN);
                session.sessionId = bb.getShort(4) & 0xFFFF;
                session.replyId = bb.getShort(6) & 0xFFFF;
            }
        }
        return session;
    }

    private void disconnectSession(Socket socket, Session session) {
        try {
            if (session.sessionId != 0) {
                sendCommand(socket, session, CMD_EXIT, new byte[0]);
            }
        } catch (Exception ignored) {
        }
    }

    private byte[] sendCommand(Socket socket, Session session, int commandCode, byte[] payload) throws Exception {
        session.replyId = (session.replyId + 1) & USHRT_MAX;
        byte[] packet = createPacket(commandCode, session.sessionId, session.replyId, payload);

        OutputStream out = socket.getOutputStream();
        out.write(packet);
        out.flush();

        return readResponse(socket.getInputStream());
    }

    private byte[] createPacket(int command, int sessionId, int replyId, byte[] payload) {
        int length = 8 + payload.length;
        ByteBuffer buffer = ByteBuffer.allocate(length).order(ByteOrder.LITTLE_ENDIAN);

        buffer.putShort((short) command);
        buffer.putShort((short) 0); // Checksum placeholder
        buffer.putShort((short) sessionId);
        buffer.putShort((short) replyId);
        buffer.put(payload);

        byte[] data = buffer.array();
        int checksum = calculateChecksum(data);
        buffer.putShort(2, (short) checksum);

        return buffer.array();
    }

    private int calculateChecksum(byte[] data) {
        int sum = 0;
        for (int i = 0; i < data.length; i += 2) {
            int w;
            if (i + 1 < data.length) {
                w = (data[i] & 0xFF) | ((data[i + 1] & 0xFF) << 8);
            } else {
                w = data[i] & 0xFF;
            }
            sum += w;
            while (sum > USHRT_MAX) {
                sum = (sum & USHRT_MAX) + 1;
            }
        }
        return (~sum) & USHRT_MAX;
    }

    private byte[] readResponse(InputStream in) throws Exception {
        byte[] buffer = new byte[4096];
        int read = in.read(buffer);
        if (read <= 0) return null;

        byte[] result = new byte[read];
        System.arraycopy(buffer, 0, result, 0, read);
        return result;
    }

    private int getResponseCode(byte[] packet) {
        if (packet == null || packet.length < 2) return -1;
        return ByteBuffer.wrap(packet).order(ByteOrder.LITTLE_ENDIAN).getShort(0) & 0xFFFF;
    }

    private String extractStringFromPayload(byte[] packet) {
        if (packet == null || packet.length <= 8) return null;
        int len = packet.length - 8;
        return new String(packet, 8, len).trim().replace("\0", "");
    }

    private Instant getDeviceTimeFromSession(Socket socket, Session session) {
        try {
            byte[] resp = sendCommand(socket, session, CMD_GET_TIME, new byte[0]);
            if (resp != null && resp.length >= 12) {
                ByteBuffer bb = ByteBuffer.wrap(resp, 8, 4).order(ByteOrder.LITTLE_ENDIAN);
                int encoded = bb.getInt();
                return decodeTime(encoded);
            }
        } catch (Exception ex) {
            log.warn("Error decoding device time: {}", ex.getMessage());
        }
        return Instant.now();
    }

    private int encodeTime(LocalDateTime dt) {
        int year = dt.getYear() % 100;
        int month = dt.getMonthValue();
        int day = dt.getDayOfMonth();
        int hour = dt.getHour();
        int minute = dt.getMinute();
        int second = dt.getSecond();

        return (((year * 12 + month - 1) * 31 + day - 1) * 24 + hour) * 3600 + minute * 60 + second;
    }

    private Instant decodeTime(int t) {
        int second = t % 60;
        t /= 60;
        int minute = t % 60;
        t /= 60;
        int hour = t % 24;
        t /= 24;
        int day = (t % 31) + 1;
        t /= 31;
        int month = (t % 12) + 1;
        t /= 12;
        int year = t + 2000;

        LocalDateTime ldt = LocalDateTime.of(year, month, day, hour, minute, second);
        return TimeUtils.toUtcInstant(ldt);
    }

    private List<RawAttendanceRecord> parseAttendanceLogs(byte[] data, String serialNumber) {
        List<RawAttendanceRecord> records = new ArrayList<>();
        if (data == null || data.length <= 8) return records;

        // Raw records in ZKTeco binary protocol have a standard record length (typically 40 bytes)
        int offset = 8;
        int recordSize = 40;

        while (offset + recordSize <= data.length) {
            try {
                ByteBuffer bb = ByteBuffer.wrap(data, offset, recordSize).order(ByteOrder.LITTLE_ENDIAN);
                byte[] pinBytes = new byte[24];
                bb.get(pinBytes);
                String pin = new String(pinBytes).trim().replace("\0", "");

                int punchTimeEncoded = bb.getInt();
                int verifyType = bb.get() & 0xFF;
                int punchState = bb.get() & 0xFF;

                if (!pin.isEmpty()) {
                    records.add(RawAttendanceRecord.builder()
                            .deviceSerialNumber(serialNumber)
                            .userPin(pin)
                            .punchTime(decodeTime(punchTimeEncoded))
                            .verifyType(mapVerifyType(verifyType))
                            .punchState(mapPunchState(punchState))
                            .build());
                }
            } catch (Exception ex) {
                log.warn("Error parsing individual attendance record at offset {}: {}", offset, ex.getMessage());
            }
            offset += recordSize;
        }

        return records;
    }

    private List<RawDeviceUser> parseUserRecords(byte[] data) {
        List<RawDeviceUser> users = new ArrayList<>();
        if (data == null || data.length <= 8) return users;

        int offset = 8;
        int recordSize = 72; // Standard user record length

        while (offset + recordSize <= data.length) {
            try {
                ByteBuffer bb = ByteBuffer.wrap(data, offset, recordSize).order(ByteOrder.LITTLE_ENDIAN);
                int pinNum = bb.getShort() & 0xFFFF;
                int privilege = bb.get() & 0xFF;
                byte[] pwdBytes = new byte[8];
                bb.get(pwdBytes);
                byte[] nameBytes = new byte[24];
                bb.get(nameBytes);

                String name = new String(nameBytes).trim().replace("\0", "");
                String pin = String.valueOf(pinNum);

                users.add(RawDeviceUser.builder()
                        .pin(pin)
                        .name(name)
                        .privilege(privilege == 14 ? "ADMIN" : "NORMAL_USER")
                        .enabled(true)
                        .build());
            } catch (Exception ex) {
                log.warn("Error parsing user record at offset {}: {}", offset, ex.getMessage());
            }
            offset += recordSize;
        }

        return users;
    }

    private String mapVerifyType(int type) {
        return switch (type) {
            case 1 -> "FINGERPRINT";
            case 2 -> "PASSWORD";
            case 3 -> "CARD";
            case 15 -> "FACE";
            default -> "OTHER";
        };
    }

    private String mapPunchState(int state) {
        return switch (state) {
            case 0 -> "CHECK_IN";
            case 1 -> "CHECK_OUT";
            case 2 -> "BREAK_OUT";
            case 3 -> "BREAK_IN";
            case 4 -> "OVERTIME_IN";
            case 5 -> "OVERTIME_OUT";
            default -> "CHECK_IN";
        };
    }
}

