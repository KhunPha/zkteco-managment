package com.zkteco.attendance.modules.device;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class ZkDeviceMasterControlService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public JsonNode execute(String ip, int port, String command, Integer voiceIndex) {
        String pythonBin = getPythonBin();
        File scriptFile = getScriptFile("scripts/zk_device_control.py");

        List<String> cmd = new ArrayList<>(List.of(
                pythonBin,
                scriptFile.getAbsolutePath(),
                "--ip", ip,
                "--port", String.valueOf(port),
                "--command", command
        ));

        if (voiceIndex != null) {
            cmd.add("--voice-index");
            cmd.add(String.valueOf(voiceIndex));
        }

        return executeProcess(cmd, 15);
    }

    public JsonNode getMenuParameters(String ip, int port) {
        String pythonBin = getPythonBin();
        File scriptFile = getScriptFile("scripts/zk_device_control.py");
        List<String> cmd = List.of(
                pythonBin,
                scriptFile.getAbsolutePath(),
                "--ip", ip,
                "--port", String.valueOf(port),
                "--command", "get-menu-params"
        );
        return executeProcess(cmd, 25);
    }

    public JsonNode setMenuParameters(String ip, int port, JsonNode params) {
        String pythonBin = getPythonBin();
        File scriptFile = getScriptFile("scripts/zk_device_control.py");
        List<String> cmd = List.of(
                pythonBin,
                scriptFile.getAbsolutePath(),
                "--ip", ip,
                "--port", String.valueOf(port),
                "--command", "set-menu-params",
                "--params", params != null ? params.toString() : "{}"
        );
        return executeProcess(cmd, 25);
    }

    public JsonNode clearAdmin(String ip, int port) {
        String pythonBin = getPythonBin();
        File scriptFile = getScriptFile("scripts/zk_device_control.py");
        List<String> cmd = List.of(
                pythonBin,
                scriptFile.getAbsolutePath(),
                "--ip", ip,
                "--port", String.valueOf(port),
                "--command", "clear-admin"
        );
        return executeProcess(cmd, 15);
    }

    public JsonNode unlockDoor(String ip, int port, int seconds) {
        String pythonBin = getPythonBin();
        File scriptFile = getScriptFile("scripts/zk_device_control.py");
        List<String> cmd = List.of(
                pythonBin,
                scriptFile.getAbsolutePath(),
                "--ip", ip,
                "--port", String.valueOf(port),
                "--command", "unlock-door",
                "--unlock-seconds", String.valueOf(seconds > 0 ? seconds : 3)
        );
        return executeProcess(cmd, 15);
    }

    public JsonNode syncAllFingerprints() {
        String pythonBin = getPythonBin();
        File scriptFile = getScriptFile("scripts/zk_biometric_fp_manager.py");

        List<String> cmd = List.of(
                pythonBin,
                scriptFile.getAbsolutePath(),
                "--action", "sync-all"
        );

        return executeProcess(cmd, 120);
    }

    public JsonNode clearAllFingerprints() {
        String pythonBin = getPythonBin();
        File scriptFile = getScriptFile("scripts/zk_biometric_fp_manager.py");

        List<String> cmd = List.of(
                pythonBin,
                scriptFile.getAbsolutePath(),
                "--action", "clear-all"
        );

        return executeProcess(cmd, 120);
    }

    public JsonNode enrollRemoteFingerprint(String ip, String pin, int fid) {
        String pythonBin = getPythonBin();
        File scriptFile = getScriptFile("scripts/zk_biometric_fp_manager.py");

        List<String> cmd = List.of(
                pythonBin,
                scriptFile.getAbsolutePath(),
                "--action", "enroll-remote",
                "--ip", (ip != null && !ip.isBlank()) ? ip : "192.168.1.202",
                "--pin", pin,
                "--fid", String.valueOf(fid)
        );

        return executeProcess(cmd, 75);
    }

    private String getPythonBin() {
        String pythonBin = "/home/sophaederson/zkteco-in01a/venv/bin/python3";
        if (!new File(pythonBin).exists()) {
            pythonBin = "python3";
        }
        return pythonBin;
    }

    private File getScriptFile(String relativePath) {
        File file = new File(relativePath);
        if (!file.exists()) {
            file = new File("/home/sophaederson/Desktop/Programming/Project/zkteco-managment/" + relativePath);
        }
        return file;
    }

    private JsonNode executeProcess(List<String> cmd, int timeoutSeconds) {
        log.info("Executing process: {}", String.join(" ", cmd));
        try {
            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(false);
            Process process = pb.start();

            // Asynchronously drain stderr so it never blocks the process
            StringBuilder stderr = new StringBuilder();
            Thread errThread = new Thread(() -> {
                try (BufferedReader errReader = new BufferedReader(new InputStreamReader(process.getErrorStream()))) {
                    String errLine;
                    while ((errLine = errReader.readLine()) != null) {
                        stderr.append(errLine).append("\n");
                    }
                } catch (Exception ignored) {}
            });
            errThread.setDaemon(true);
            errThread.start();

            StringBuilder stdout = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    stdout.append(line).append("\n");
                }
            }

            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                log.error("Command timed out after {}s: {}", timeoutSeconds, String.join(" ", cmd));
                return objectMapper.createObjectNode()
                        .put("success", false)
                        .put("message", "Device operation timed out after " + timeoutSeconds + " seconds");
            }

            String outputStr = stdout.toString().trim();
            log.info("Process stdout: {}", outputStr);
            if (!stderr.isEmpty()) {
                log.info("Process stderr: {}", stderr.toString().trim());
            }

            // Find line containing valid JSON from stdout
            if (!outputStr.isEmpty()) {
                String[] lines = outputStr.split("\n");
                for (int i = lines.length - 1; i >= 0; i--) {
                    String l = lines[i].trim();
                    if (l.startsWith("{") && l.endsWith("}")) {
                        try {
                            return objectMapper.readTree(l);
                        } catch (Exception ignored) {
                        }
                    }
                }
            }

            // Fallback if stdout had no valid JSON
            String fallbackMsg = !outputStr.isEmpty() ? outputStr : stderr.toString().trim();
            if (fallbackMsg.isEmpty()) {
                fallbackMsg = "Empty response from device utility";
            }
            return objectMapper.createObjectNode()
                    .put("success", false)
                    .put("message", fallbackMsg);
        } catch (Exception e) {
            log.error("Error executing process: {}", e.getMessage(), e);
            return objectMapper.createObjectNode()
                    .put("success", false)
                    .put("message", "Execution error: " + e.getMessage());
        }
    }
}
