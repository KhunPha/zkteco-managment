package com.zkteco.attendance.modules.zkteco;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/iclock")
@RequiredArgsConstructor
@Tag(name = "ZKTeco ADMS Push Protocol", description = "Standard Push Protocol endpoints for ADMS biometric terminals")
public class ZKTecoPushController {

    private final ZKTecoPushService pushService;

    @GetMapping(value = "/cdata", produces = MediaType.TEXT_PLAIN_VALUE)
    @Operation(summary = "ADMS device handshake and options request")
    public ResponseEntity<String> handshake(
            @RequestParam(name = "SN") String sn,
            @RequestParam(name = "options", required = false) String options,
            @RequestParam(name = "pushver", required = false) String pushver) {
        String response = pushService.handleHandshake(sn, options, pushver);
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/cdata", consumes = MediaType.ALL_VALUE, produces = MediaType.TEXT_PLAIN_VALUE)
    @Operation(summary = "ADMS device real-time and batch attendance event ingestion")
    public ResponseEntity<String> receivePushData(
            @RequestParam(name = "SN") String sn,
            @RequestParam(name = "table", required = false) String table,
            @RequestBody(required = false) String payload) {
        String response = pushService.handlePushData(sn, table, payload);
        return ResponseEntity.ok(response);
    }

    @GetMapping(value = "/getrequest", produces = MediaType.TEXT_PLAIN_VALUE)
    @Operation(summary = "ADMS device polling for queued server commands")
    public ResponseEntity<String> getRequest(@RequestParam(name = "SN") String sn) {
        String response = pushService.pollPendingCommands(sn);
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/devicecmd", consumes = MediaType.ALL_VALUE, produces = MediaType.TEXT_PLAIN_VALUE)
    @Operation(summary = "ADMS device command execution feedback")
    public ResponseEntity<String> deviceCmd(
            @RequestParam(name = "SN") String sn,
            @RequestBody(required = false) String body) {
        String response = pushService.handleCommandResult(sn, body);
        return ResponseEntity.ok(response);
    }
}

