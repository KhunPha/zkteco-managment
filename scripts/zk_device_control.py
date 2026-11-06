#!/usr/bin/env python3
"""
ZKTeco Machine Master Control Utility.
Provides full remote control over ZKTeco IN01-A biometric terminals via TCP:
- sync-time: Synchronize terminal clock to exact computer local time
- get-info: Retrieve live hardware info, firmware, MAC, clock drift, users count, att logs count
- restart: Reboot terminal remotely
- poweroff: Power down terminal remotely
- disable: Lock/disable terminal keypad and sensor
- enable: Unlock/enable terminal
- test-voice: Play voice prompt / speaker test ("Thank You")
- clear-attlog: Clear stored punch buffer on terminal
- pull-logs: Download attendance logs
Usage:
  python3 zk_device_control.py --ip 192.168.1.201 --command sync-time
"""

import sys
import json
import argparse
import datetime
import logging
from zk import ZK, const

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("zk_control")

def get_connection(ip, port=4370, timeout=4):
    zk = ZK(ip, port=port, timeout=timeout, force_udp=False)
    conn = zk.connect()
    return zk, conn

def cmd_sync_time(ip, port):
    zk, conn = get_connection(ip, port)
    try:
        now = datetime.datetime.now()
        conn.disable_device()
        conn.set_time(now)
        conn.refresh_data()
        conn.enable_device()
        updated_time = conn.get_time()
        drift_seconds = abs((updated_time - now).total_seconds())
        logger.info(f"[{ip}] Synced time to {now}. Terminal time is now: {updated_time} (drift: {drift_seconds:.1f}s)")
        return {
            "success": True,
            "computer_time": str(now),
            "machine_time": str(updated_time),
            "drift_seconds": drift_seconds,
            "message": f"Successfully synchronized clock to {now.strftime('%Y-%m-%d %H:%M:%S')}"
        }
    finally:
        try:
            conn.enable_device()
        except Exception:
            pass
        try:
            conn.disconnect()
        except Exception:
            pass

def cmd_get_info(ip, port):
    zk, conn = get_connection(ip, port)
    try:
        now = datetime.datetime.now()
        dev_time = conn.get_time()
        drift_seconds = (dev_time - now).total_seconds()
        
        name = conn.get_device_name()
        fw = conn.get_firmware_version()
        sn = conn.get_serialnumber()
        platform = conn.get_platform()
        mac = conn.get_mac()
        
        users_count = len(conn.get_users())
        att_count = len(conn.get_attendance())
        
        return {
            "success": True,
            "device_name": name,
            "firmware_version": fw,
            "serial_number": sn,
            "platform": platform,
            "mac_address": mac,
            "machine_time": str(dev_time),
            "computer_time": str(now),
            "drift_seconds": round(drift_seconds, 1),
            "users_count": users_count,
            "attendance_count": att_count,
            "online": True
        }
    finally:
        try:
            conn.disconnect()
        except Exception:
            pass

def cmd_restart(ip, port):
    zk, conn = get_connection(ip, port)
    try:
        logger.info(f"[{ip}] Restarting terminal...")
        conn.restart()
        return {"success": True, "message": f"Restart signal sent to {ip}"}
    finally:
        try:
            conn.disconnect()
        except Exception:
            pass

def cmd_poweroff(ip, port):
    zk, conn = get_connection(ip, port)
    try:
        logger.info(f"[{ip}] Powering off terminal...")
        conn.poweroff()
        return {"success": True, "message": f"Power off signal sent to {ip}"}
    finally:
        try:
            conn.disconnect()
        except Exception:
            pass

def cmd_disable(ip, port):
    zk, conn = get_connection(ip, port)
    try:
        conn.disable_device()
        return {"success": True, "message": f"Terminal {ip} locked/disabled"}
    finally:
        try:
            conn.disconnect()
        except Exception:
            pass

def cmd_enable(ip, port):
    zk, conn = get_connection(ip, port)
    try:
        conn.enable_device()
        return {"success": True, "message": f"Terminal {ip} unlocked/enabled"}
    finally:
        try:
            conn.disconnect()
        except Exception:
            pass

def cmd_test_voice(ip, port, index=0):
    zk, conn = get_connection(ip, port)
    try:
        ok = conn.test_voice(index=index)
        return {"success": ok, "message": f"Played voice prompt (index {index}) on {ip}"}
    finally:
        try:
            conn.disconnect()
        except Exception:
            pass

def cmd_clear_attlog(ip, port):
    zk, conn = get_connection(ip, port)
    try:
        conn.clear_attendance()
        conn.refresh_data()
        return {"success": True, "message": f"Attendance logs cleared on {ip}"}
    finally:
        try:
            conn.disconnect()
        except Exception:
            pass

def cmd_clear_admin(ip, port):
    """Cancel manager/administrator role on device to rescue locked menus without data loss"""
    zk, conn = get_connection(ip, port)
    try:
        res = conn._ZK__send_command(const.CMD_CLEAR_ADMIN, b"", 8)
        conn.refresh_data()
        status = bool(res.get("status"))
        return {
            "success": status,
            "message": "Admin privileges cleared on terminal keypad. Menu is now unlocked for all users." if status else "Terminal did not accept clear admin command"
        }
    finally:
        try:
            conn.disconnect()
        except Exception:
            pass

def cmd_unlock_door(ip, port, seconds=3):
    """Trigger physical door lock / turnstile relay remotely"""
    zk, conn = get_connection(ip, port)
    try:
        conn.unlock(time=seconds)
        return {
            "success": True,
            "message": f"Door relay unlocked for {seconds} seconds on {ip}"
        }
    finally:
        try:
            conn.disconnect()
        except Exception:
            pass

def cmd_get_menu_params(ip, port):
    """Retrieve full menu parameters from physical terminal"""
    zk, conn = get_connection(ip, port)
    try:
        query_keys = [
            "~DeviceName", "~SerialNumber", "~Platform", "~OS", "~ZKFPVersion",
            "IPAddress", "NetMask", "GATEIPAddress",
            "VoiceOn", "KeyPadBeep", "Language", "Volume",
            "MThreshold", "VThreshold",
            "LockFunOn", "Door1Delay", "Door1SensorType",
            "DateFormat", "TimeFormat", "IdleTime", "SleepTime",
            "~MaxUserCount", "~MaxAttLogCount", "~MaxFingerCount",
            "~UserCount", "~AttLogCount", "~FingerCount", "~AdminCount"
        ]
        params = {}
        for k in query_keys:
            try:
                conn._ZK__send_command(const.CMD_OPTIONS_RRQ, f"{k}\x00".encode(), 1024)
                raw = conn._ZK__data.decode("latin1", errors="ignore")
                if "=" in raw:
                    val = raw.split("=", 1)[-1].strip("\x00")
                    if val != "":
                        params[k] = val
            except Exception:
                pass

        # Also get live users and att logs count
        try:
            users = conn.get_users()
            params["live_users_count"] = len(users)
        except Exception:
            pass

        try:
            att = conn.get_attendance()
            params["live_att_count"] = len(att)
        except Exception:
            pass

        dev_time = conn.get_time()
        now = datetime.datetime.now()
        drift = round((dev_time - now).total_seconds(), 1)

        return {
            "success": True,
            "parameters": params,
            "device_time": str(dev_time),
            "computer_time": str(now),
            "drift_seconds": drift,
            "ip": ip,
            "port": port
        }
    finally:
        try:
            conn.disconnect()
        except Exception:
            pass

def cmd_set_menu_params(ip, port, params_dict):
    """Write menu parameters to physical terminal and commit"""
    zk, conn = get_connection(ip, port)
    try:
        applied = {}
        failed = {}
        for k, v in params_dict.items():
            try:
                cmd_str = f"{k}={v}\x00".encode()
                res = conn._ZK__send_command(const.CMD_OPTIONS_WRQ, cmd_str, 1024)
                if res.get("status"):
                    applied[k] = v
                else:
                    failed[k] = "Terminal rejected setting"
            except Exception as ex:
                failed[k] = str(ex)

        conn.refresh_data()
        return {
            "success": len(applied) > 0,
            "applied": applied,
            "failed": failed,
            "message": f"Successfully updated {len(applied)} parameters on terminal {ip}"
        }
    finally:
        try:
            conn.disconnect()
        except Exception:
            pass

def main():
    parser = argparse.ArgumentParser(description="Master control utility for ZKTeco terminals")
    parser.add_argument("--ip", required=True, help="Terminal IP address (e.g. 192.168.1.201)")
    parser.add_argument("--port", type=int, default=4370, help="Terminal port (default 4370)")
    parser.add_argument("--command", required=True, choices=[
        "sync-time", "get-info", "restart", "poweroff", "disable", "enable", "test-voice", "clear-attlog",
        "clear-admin", "unlock-door", "get-menu-params", "set-menu-params"
    ], help="Command to execute")
    parser.add_argument("--voice-index", type=int, default=0, help="Voice prompt index (0 = Thank you)")
    parser.add_argument("--unlock-seconds", type=int, default=3, help="Duration to unlock door relay in seconds")
    parser.add_argument("--params", type=str, default="{}", help="JSON dictionary of parameters to set")

    args = parser.parse_args()

    try:
        if args.command == "sync-time":
            res = cmd_sync_time(args.ip, args.port)
        elif args.command == "get-info":
            res = cmd_get_info(args.ip, args.port)
        elif args.command == "restart":
            res = cmd_restart(args.ip, args.port)
        elif args.command == "poweroff":
            res = cmd_poweroff(args.ip, args.port)
        elif args.command == "disable":
            res = cmd_disable(args.ip, args.port)
        elif args.command == "enable":
            res = cmd_enable(args.ip, args.port)
        elif args.command == "test-voice":
            res = cmd_test_voice(args.ip, args.port, args.voice_index)
        elif args.command == "clear-attlog":
            res = cmd_clear_attlog(args.ip, args.port)
        elif args.command == "clear-admin":
            res = cmd_clear_admin(args.ip, args.port)
        elif args.command == "unlock-door":
            res = cmd_unlock_door(args.ip, args.port, args.unlock_seconds)
        elif args.command == "get-menu-params":
            res = cmd_get_menu_params(args.ip, args.port)
        elif args.command == "set-menu-params":
            params_dict = json.loads(args.params)
            res = cmd_set_menu_params(args.ip, args.port, params_dict)
        else:
            res = {"success": False, "message": f"Unknown command {args.command}"}
        print(json.dumps(res))
    except Exception as e:
        logger.error(f"Command '{args.command}' failed on {args.ip}: {e}")
        print(json.dumps({"success": False, "error": str(e), "message": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()

