#!/usr/bin/env python3
"""
ZKTeco Machine User Synchronizer CLI.
Synchronizes user records (PIN, Name, RFID Card, Privilege) directly to physical ZKTeco IN01-A terminals via TCP.
Usage:
  python3 sync_user_to_device.py --pin 3001 --name "Chan Vutha" --card "0005359493" [--ip 192.168.1.202]
"""

import sys
import json
import argparse
import logging
from zk import ZK, const

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("zk_sync")

DEFAULT_DEVICES = [
    {"ip": "192.168.1.201", "port": 4370},
    {"ip": "192.168.1.202", "port": 4370}
]

def clean_pin(pin_str):
    if not pin_str:
        return "1"
    # Take alphanumeric or clean digits
    return str(pin_str).strip()

def clean_card(card_str):
    if not card_str:
        return 0
    clean = "".join(filter(str.isdigit, str(card_str)))
    return int(clean) if clean else 0

def clean_name(name_str):
    if not name_str:
        return ""
    # IN01-A supports up to 24 characters on terminal display
    return str(name_str).strip()[:24]

def sync_user(ip, port, pin, name, card, privilege="NORMAL_USER", password=""):
    zk = None
    conn = None
    try:
        priv_code = const.USER_ADMIN if str(privilege).upper() in ("ADMIN", "SUPER_ADMIN") else const.USER_DEFAULT
        zk = ZK(ip, port=port, timeout=4, force_udp=False)
        conn = zk.connect()
        conn.disable_device()

        # Find existing UID if user is already present, or use numeric PIN / hash
        numeric_uid = None
        try:
            numeric_uid = int("".join(filter(str.isdigit, str(pin))))
            if numeric_uid <= 0 or numeric_uid > 65535:
                numeric_uid = (hash(pin) % 65000) + 1
        except Exception:
            numeric_uid = (hash(pin) % 65000) + 1

        users = conn.get_users()
        existing = next((u for u in users if str(u.user_id) == str(pin)), None)
        if existing and existing.uid:
            numeric_uid = existing.uid

        card_int = clean_card(card)
        safe_name = clean_name(name)

        logger.info(f"Setting user on {ip}:{port} -> PIN={pin}, UID={numeric_uid}, Name='{safe_name}', Card={card_int}, Priv={priv_code}")
        conn.set_user(
            uid=numeric_uid,
            name=safe_name,
            privilege=priv_code,
            password=str(password) if password else "",
            group_id="",
            user_id=str(pin),
            card=card_int
        )
        conn.refresh_data()
        conn.enable_device()
        return True, f"Synced to {ip}"
    except Exception as e:
        logger.error(f"Failed to sync user {pin} to {ip}:{port}: {e}")
        return False, str(e)
    finally:
        if conn:
            try:
                conn.enable_device()
            except Exception:
                pass
            try:
                conn.disconnect()
            except Exception:
                pass

def delete_user(ip, port, pin):
    zk = None
    conn = None
    try:
        zk = ZK(ip, port=port, timeout=4, force_udp=False)
        conn = zk.connect()
        conn.disable_device()

        users = conn.get_users()
        existing = next((u for u in users if str(u.user_id) == str(pin)), None)
        if existing:
            conn.delete_user(uid=existing.uid, user_id=str(pin))
            conn.refresh_data()
            logger.info(f"Deleted user {pin} from {ip}:{port}")
        conn.enable_device()
        return True, f"Deleted from {ip}"
    except Exception as e:
        logger.error(f"Failed to delete user {pin} from {ip}:{port}: {e}")
        return False, str(e)
    finally:
        if conn:
            try:
                conn.enable_device()
            except Exception:
                pass
            try:
                conn.disconnect()
            except Exception:
                pass

def main():
    parser = argparse.ArgumentParser(description="Sync user to ZKTeco biometric terminals")
    parser.add_argument("--action", choices=["sync", "delete"], default="sync", help="Action to perform")
    parser.add_argument("--pin", required=True, help="User PIN / Employee Code / Student Code")
    parser.add_argument("--name", default="", help="User display name on terminal")
    parser.add_argument("--card", default="0", help="RFID Card number")
    parser.add_argument("--privilege", default="NORMAL_USER", help="Privilege (NORMAL_USER or ADMIN)")
    parser.add_argument("--password", default="", help="Terminal keypad password")
    parser.add_argument("--ip", default=None, help="Specific device IP (optional, defaults to all active devices)")
    parser.add_argument("--port", type=int, default=4370, help="Device port (default 4370)")

    args = parser.parse_args()

    targets = []
    if args.ip:
        targets.append({"ip": args.ip, "port": args.port})
    else:
        targets = DEFAULT_DEVICES

    results = []
    all_ok = True

    for dev in targets:
        if args.action == "delete":
            ok, msg = delete_user(dev["ip"], dev["port"], args.pin)
        else:
            ok, msg = sync_user(
                dev["ip"], dev["port"],
                args.pin, args.name, args.card,
                args.privilege, args.password
            )
        results.append({"ip": dev["ip"], "success": ok, "message": msg})
        if not ok:
            all_ok = False

    output = {
        "success": all_ok,
        "pin": args.pin,
        "action": args.action,
        "results": results
    }
    print(json.dumps(output))

if __name__ == "__main__":
    main()

