/**
 * High-Fidelity ZKTeco Terminal Hardware Simulator
 * Simulates both:
 * 1. ADMS Push Client (pushes to Spring Boot backend http://localhost:8484/iclock/cdata)
 * 2. Standalone TCP Server (listens on port 4370 for Spring Boot TCP/IP client pull commands)
 */

const net = require('net');
const http = require('http');
const readline = require('readline');

const CONFIG = {
  serialNumber: process.env.SIMULATOR_SN || 'ZK-SIM-8888',
  deviceName: 'Simulated Face & Fingerprint Terminal',
  backendHost: process.env.BACKEND_HOST || 'localhost',
  backendPort: parseInt(process.env.BACKEND_PORT || '8484'),
  tcpPort: parseInt(process.env.SIMULATOR_TCP_PORT || '4370'),
  pushIntervalSec: 30
};

// =============================================================================
// 1. ADMS PUSH CLIENT SIMULATION
// =============================================================================

class AdmsSimulator {
  constructor(sn, host, port) {
    this.sn = sn;
    this.host = host;
    this.port = port;
  }

  sendHandshake() {
    const path = `/iclock/cdata?SN=${this.sn}&options=all&pushver=2.4.0`;
    console.log(`[ADMS] Sending Handshake to http://${this.host}:${this.port}${path}`);

    const req = http.request({
      hostname: this.host,
      port: this.port,
      path: path,
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[ADMS Handshake Response]:\n${data.trim()}`);
      });
    });

    req.on('error', err => {
      console.warn(`[ADMS Error]: Handshake connection refused (${err.message}). Is backend running?`);
    });
    req.end();
  }

  pushAttendance(pin, punchTimeStr, stateCode = 0, verifyCode = 1) {
    // Standard ZKTeco ADMS ATTLOG format: PIN\tYYYY-MM-DD HH:mm:ss\tSTATE\tVERIFY\tWORKCODE
    const line = `${pin}\t${punchTimeStr}\t${stateCode}\t${verifyCode}\t0\n`;
    const path = `/iclock/cdata?SN=${this.sn}&table=ATTLOG`;

    console.log(`[ADMS] Pushing Attendance: PIN=${pin}, Time=${punchTimeStr}, State=${stateCode}`);

    const req = http.request({
      hostname: this.host,
      port: this.port,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(line)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[ADMS Ingestion Result]: ${data.trim()}`);
      });
    });

    req.on('error', err => {
      console.error(`[ADMS Error]: Failed to push log: ${err.message}`);
    });

    req.write(line);
    req.end();
  }

  pollCommands() {
    const path = `/iclock/getrequest?SN=${this.sn}`;
    const req = http.request({
      hostname: this.host,
      port: this.port,
      path: path,
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const cmd = data.trim();
        if (cmd !== 'OK' && cmd.startsWith('C:')) {
          console.log(`[ADMS Command Received]: ${cmd}`);
          // Send acknowledgment
          const parts = cmd.split(':');
          if (parts.length >= 2) {
            this.reportCommandResult(parts[1], 0);
          }
        }
      });
    });

    req.on('error', () => {});
    req.end();
  }

  reportCommandResult(cmdId, returnCode) {
    const body = `ID=${cmdId}&Return=${returnCode}&CMD=SUCCESS`;
    const req = http.request({
      hostname: this.host,
      port: this.port,
      path: `/iclock/devicecmd?SN=${this.sn}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    }, () => {});
    req.on('error', () => {});
    req.write(body);
    req.end();
  }
}

// =============================================================================
// 2. TCP/IP SERVER SIMULATION (PORT 4370)
// =============================================================================

function startTcpServer(port) {
  const server = net.createServer((socket) => {
    console.log(`[TCP Simulator] New connection from ${socket.remoteAddress}:${socket.remotePort}`);

    let sessionId = 1001;
    let replyId = 1;

    socket.on('data', (data) => {
      if (data.length < 8) return;

      const command = data.readUInt16LE(0);
      const reqSessionId = data.readUInt16LE(4);
      const reqReplyId = data.readUInt16LE(6);

      console.log(`[TCP Simulator] Command received: 0x${command.toString(16)} (${command})`);

      // Commands:
      // 1000 = CMD_CONNECT -> reply 2000 (ACK_OK)
      // 1001 = CMD_EXIT -> reply 2000
      // 1100 = CMD_VERSION -> reply version string
      // 201 = CMD_GET_TIME -> reply current time
      // 202 = CMD_SET_TIME -> reply 2000
      // 9 = CMD_ATTLOG_RRQ -> reply attendance logs

      let respPayload = Buffer.alloc(0);
      let respCode = 2000; // CMD_ACK_OK

      if (command === 1000) {
        // Handshake Connect
        sessionId = Math.floor(Math.random() * 60000) + 1;
        console.log(`[TCP Simulator] Handshake established with session ID: ${sessionId}`);
      } else if (command === 1100) {
        // Version
        respPayload = Buffer.from("Ver 6.60 (Apr 2026)\0");
      } else if (command === 201) {
        // Get Time
        const now = new Date();
        const encoded = encodeTime(now);
        respPayload = Buffer.alloc(4);
        respPayload.writeUInt32LE(encoded, 0);
      } else if (command === 9) {
        // Return 1 simulated log record (40 bytes per record)
        respPayload = Buffer.alloc(40);
        respPayload.write("EMP001\0", 0, 24);
        respPayload.writeUInt32LE(encodeTime(new Date()), 24);
        respPayload.writeUInt8(1, 28); // verify type
        respPayload.writeUInt8(0, 29); // punch state
      }

      const response = createResponsePacket(respCode, sessionId, reqReplyId, respPayload);
      socket.write(response);
    });

    socket.on('error', (err) => {
      console.warn(`[TCP Simulator] Socket error: ${err.message}`);
    });
  });

  server.listen(port, () => {
    console.log(`[TCP Simulator] ZKTeco Device TCP Server listening on port ${port}`);
  });
}

function createResponsePacket(command, sessionId, replyId, payload) {
  const length = 8 + payload.length;
  const buffer = Buffer.alloc(length);

  buffer.writeUInt16LE(command, 0);
  buffer.writeUInt16LE(0, 2); // Checksum placeholder
  buffer.writeUInt16LE(sessionId, 4);
  buffer.writeUInt16LE(replyId, 6);
  if (payload.length > 0) {
    payload.copy(buffer, 8);
  }

  // Calculate 16-bit checksum
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 2) {
    let w = buffer.readUInt8(i);
    if (i + 1 < buffer.length) {
      w |= (buffer.readUInt8(i + 1) << 8);
    }
    sum += w;
    while (sum > 65535) {
      sum = (sum & 65535) + 1;
    }
  }
  const checksum = (~sum) & 65535;
  buffer.writeUInt16LE(checksum, 2);

  return buffer;
}

function encodeTime(date) {
  const year = date.getFullYear() % 100;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return (((year * 12 + month - 1) * 31 + day - 1) * 24 + hour) * 3600 + minute * 60 + second;
}

// =============================================================================
// 3. CLI & RUNNER
// =============================================================================

function main() {
  console.log('================================================================');
  console.log('   ZKTECO BIOMETRIC ATTENDANCE HARDWARE SIMULATOR');
  console.log(`   Device Serial Number: ${CONFIG.serialNumber}`);
  console.log(`   Connecting to Backend: http://${CONFIG.backendHost}:${CONFIG.backendPort}`);
  console.log(`   TCP Listener Port: ${CONFIG.tcpPort}`);
  console.log('================================================================\n');

  // Start TCP server
  try {
    startTcpServer(CONFIG.tcpPort);
  } catch (err) {
    console.warn(`[TCP] Could not bind port ${CONFIG.tcpPort}: ${err.message}`);
  }

  // Initialize ADMS client
  const adms = new AdmsSimulator(CONFIG.serialNumber, CONFIG.backendHost, CONFIG.backendPort);
  adms.sendHandshake();

  // Periodic command polling
  setInterval(() => {
    adms.pollCommands();
  }, 10000);

  // Interactive Terminal CLI
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n--- SIMULATOR CLI COMMANDS ---');
  console.log('  punch <PIN> [IN|OUT]    - Trigger an attendance punch right now');
  console.log('  batch                   - Simulate a batch of 5 employee check-ins');
  console.log('  handshake               - Re-send ADMS registration handshake');
  console.log('  exit                    - Stop simulator\n');

  rl.setPrompt('zk-sim> ');
  rl.prompt();

  rl.on('line', (line) => {
    const trimmed = line.trim();
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    if (cmd === 'punch') {
      const pin = parts[1] || 'EMP001';
      const type = (parts[2] || 'IN').toUpperCase();
      const stateCode = (type === 'OUT') ? 1 : 0;

      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const timeStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      adms.pushAttendance(pin, timeStr, stateCode, 1);
    } else if (cmd === 'batch') {
      console.log('[Simulator] Generating batch check-ins for EMP001..EMP005...');
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const timeStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} 08:${pad(Math.floor(Math.random()*15))}:${pad(Math.floor(Math.random()*59))}`;

      ['EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005'].forEach((pin, i) => {
        setTimeout(() => {
          adms.pushAttendance(pin, timeStr, 0, 1);
        }, i * 300);
      });
    } else if (cmd === 'handshake') {
      adms.sendHandshake();
    } else if (cmd === 'exit') {
      console.log('Exiting simulator.');
      process.exit(0);
    } else if (trimmed) {
      console.log(`Unknown command: ${trimmed}. Available: punch <PIN> [IN|OUT], batch, handshake, exit`);
    }
    rl.prompt();
  });
}

main();

