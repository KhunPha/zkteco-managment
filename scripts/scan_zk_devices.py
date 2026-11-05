#!/usr/bin/env python3
"""
ZKTeco LAN Device Discovery & Hardware Scanner
Scans the local subnet for ZKTeco biometric terminals on UDP/TCP port 4370.
Queries device firmware, model, serial number, and MAC address.
"""

import sys
import socket
import struct
import concurrent.futures
import json
import argparse

def calculate_checksum(data):
    s = 0
    for i in range(0, len(data), 2):
        if i + 1 < len(data):
            w = data[i] | (data[i + 1] << 8)
        else:
            w = data[i]
        s += w
        while s > 65535:
            s = (s & 65535) + 1
    return (~s) & 65535

def make_packet(cmd, session_id, reply_id, payload=b''):
    buf = bytearray(struct.pack('<HHHH', cmd, 0, session_id, reply_id) + payload)
    chk = calculate_checksum(buf)
    struct.pack_into('<H', buf, 2, chk)
    return bytes(buf)

def make_commkey(key, session_id, ticks=50):
    key = int(key)
    session_id = int(session_id)
    k = 0
    for i in range(32):
        if key & (1 << i):
            k = (k << 1 | 1)
        else:
            k = k << 1
    k += session_id
    k = struct.pack(b'I', k)
    k = struct.unpack(b'BBBB', k)
    k = struct.pack(b'BBBB', k[0] ^ ord('Z'), k[1] ^ ord('K'), k[2] ^ ord('S'), k[3] ^ ord('O'))
    k = struct.unpack(b'HH', k)
    k = struct.pack(b'HH', k[1], k[0])
    B = 0xff & ticks
    k = struct.unpack(b'BBBB', k)
    k = struct.pack(b'BBBB', k[0] ^ B, k[1] ^ B, B, k[3] ^ B)
    return k

def probe_device(ip, port=4370, timeout=0.6, comm_key=0):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(timeout)
    try:
        # Step 1: Connect Handshake (CMD_CONNECT = 1000)
        buf = make_packet(1000, 0, 0)
        sock.sendto(buf, (ip, port))
        resp, _ = sock.recvfrom(1024)
        if len(resp) < 8:
            return None
        code, _, session_id, reply_id = struct.unpack('<HHHH', resp[:8])
        if code not in (2000, 2005):
            return None
        
        info = {
            'ip': ip,
            'port': port,
            'status': 'ONLINE',
            'serial_number': None,
            'model': None,
            'firmware': None,
            'mac': None,
            'comm_key': comm_key
        }

        # Step 2: Authenticate if device asks for CMD_ACK_UNAUTH (2005)
        if code == 2005:
            auth_key = make_commkey(comm_key, session_id)
            reply_id = (reply_id + 1) & 65535
            auth_buf = make_packet(1102, session_id, reply_id, auth_key)
            sock.sendto(auth_buf, (ip, port))
            auth_resp, _ = sock.recvfrom(1024)
            auth_code = struct.unpack('<H', auth_resp[:2])[0]
            if auth_code != 2000:
                info['status'] = 'AUTH_REQUIRED'
                return info

        # Step 3: Get Firmware Version (CMD_VERSION = 1100)
        reply_id = (reply_id + 1) & 65535
        sock.sendto(make_packet(1100, session_id, reply_id), (ip, port))
        try:
            ver_resp, _ = sock.recvfrom(1024)
            if len(ver_resp) > 8:
                info['firmware'] = ver_resp[8:].decode('utf-8', errors='ignore').strip('\x00')
        except Exception:
            pass

        # Step 4: Get Device Info parameters
        for param in ['~SerialNumber', '~DeviceName', 'MAC']:
            reply_id = (reply_id + 1) & 65535
            sock.sendto(make_packet(11, session_id, reply_id, param.encode() + b'\x00'), (ip, port))
            try:
                p_resp, _ = sock.recvfrom(1024)
                if len(p_resp) > 8:
                    val = p_resp[8:].decode('utf-8', errors='ignore').strip('\x00')
                    if '=' in val:
                        val = val.split('=', 1)[1]
                    if param == '~SerialNumber':
                        info['serial_number'] = val
                    elif param == '~DeviceName':
                        info['model'] = val
                    elif param == 'MAC':
                        info['mac'] = val
            except Exception:
                pass

        # Step 5: Graceful Disconnect (CMD_EXIT = 1001)
        reply_id = (reply_id + 1) & 65535
        sock.sendto(make_packet(1001, session_id, reply_id), (ip, port))
        return info
    except Exception:
        return None
    finally:
        sock.close()

def scan_subnet(base_subnet="192.168.1", start=1, end=254, timeout=0.5, max_workers=60):
    ips = [f"{base_subnet}.{i}" for i in range(start, end + 1)]
    found = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        results = executor.map(lambda ip: probe_device(ip, timeout=timeout), ips)
        for r in results:
            if r:
                found.append(r)
    return found

def register_devices(devices, backend_url="http://localhost:8484", username="admin", password="Admin@123456"):
    import urllib.request
    import urllib.error

    # 1. Login to get JWT
    login_url = f"{backend_url}/api/v1/auth/login"
    login_data = json.dumps({"username": username, "password": password}).encode("utf-8")
    req = urllib.request.Request(login_url, data=login_data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as resp:
            login_res = json.loads(resp.read().decode("utf-8"))
            token = login_res.get("data", {}).get("accessToken")
            if not token:
                print("[!] Failed to obtain JWT token for auto-registration.")
                return
    except Exception as e:
        print(f"[!] Could not connect to backend at {backend_url}: {e}")
        return

    # 2. Register each device
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    for d in devices:
        sn = d.get("serial_number") or f"ZK-{d['ip'].replace('.', '')}"
        name = f"{d.get('model') or 'ZKTeco Terminal'} ({d['ip']})"
        payload = {
            "name": name,
            "serialNumber": sn,
            "model": d.get("model") or "IN01-A/ID",
            "ipAddress": d["ip"],
            "port": d["port"],
            "commKey": str(d.get("comm_key", 0)),
            "integrationType": "TCP_PULL",
            "location": f"LAN ({d['ip']})",
            "active": True
        }

        req = urllib.request.Request(f"{backend_url}/api/v1/devices", data=json.dumps(payload).encode("utf-8"), headers=headers)
        try:
            with urllib.request.urlopen(req) as resp:
                res_data = json.loads(resp.read().decode("utf-8"))
                print(f"[✓] Registered '{name}' (SN: {sn}) successfully!")
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            if "already registered" in err_body or "duplicate" in err_body.lower() or e.code == 409:
                print(f"[i] Device '{name}' (SN: {sn}) is already registered.")
            else:
                print(f"[!] Registration failed for {d['ip']}: {err_body}")
        except Exception as e:
            print(f"[!] Error registering {d['ip']}: {e}")

def main():
    parser = argparse.ArgumentParser(description="Scan local area network for ZKTeco devices.")
    parser.add_argument("--subnet", default="192.168.1", help="Base subnet to scan (e.g., 192.168.1)")
    parser.add_argument("--start", type=int, default=1, help="Start IP host (default: 1)")
    parser.add_argument("--end", type=int, default=254, help="End IP host (default: 254)")
    parser.add_argument("--timeout", type=float, default=0.6, help="Socket timeout per IP in seconds (default: 0.6)")
    parser.add_argument("--json", action="store_true", help="Output in JSON format")
    parser.add_argument("--register", action="store_true", help="Automatically register discovered devices into backend")
    parser.add_argument("--backend", default="http://localhost:8484", help="Backend API URL (default: http://localhost:8484)")
    args = parser.parse_args()

    if not args.json:
        print(f"[*] Scanning subnet {args.subnet}.{args.start} to {args.subnet}.{args.end} on port 4370...")

    devices = scan_subnet(base_subnet=args.subnet, start=args.start, end=args.end, timeout=args.timeout)

    if args.json:
        print(json.dumps(devices, indent=2))
        return

    if not devices:
        print("[!] No ZKTeco devices found.")
        return

    print(f"\n[+] Found {len(devices)} ZKTeco device(s):\n")
    for idx, d in enumerate(devices, start=1):
        print(f"Device #{idx}:")
        print(f"  - IP Address:     {d['ip']}:{d['port']}")
        print(f"  - Device Model:   {d.get('model') or 'Unknown'}")
        print(f"  - Serial Number:  {d.get('serial_number') or 'Unknown'}")
        print(f"  - Firmware:       {d.get('firmware') or 'Unknown'}")
        print(f"  - MAC Address:    {d.get('mac') or 'Unknown'}")
        print(f"  - Status:         {d['status']}")
        print()

    if args.register:
        print("[*] Registering discovered devices into the system...")
        register_devices(devices, backend_url=args.backend)
        print(f"  - Firmware:       {d.get('firmware') or 'Unknown'}")
        print(f"  - MAC Address:    {d.get('mac') or 'Unknown'}")
        print(f"  - Status:         {d['status']}")
        print()

if __name__ == "__main__":
    main()
