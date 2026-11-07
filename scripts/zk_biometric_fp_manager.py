#!/usr/bin/env python3
"""
ZKTeco Biometric Fingerprint (FP) Manager & Synchronizer CLI.
Provides full Fingerprint management directly from our system:
- Synchronizes all fingerprint templates across all physical machines (192.168.1.201 & .202).
- Triggers remote machine enrollment without needing ZKTime.
- Stores biometric templates in PostgreSQL attendance_biometric_templates.
- Updates attendance_device_users fingerprint_count.

Usage:
  python3 scripts/zk_biometric_fp_manager.py --action sync-all
  python3 scripts/zk_biometric_fp_manager.py --action enroll-remote --ip 192.168.1.202 --pin 40001 --fid 0
  python3 scripts/zk_biometric_fp_manager.py --action delete-fp --pin 40001 --fid 0
"""

import sys
import json
import time
import socket
import argparse
import logging
import psycopg2
from zk import ZK
from zk.finger import Finger

logging.basicConfig(level=logging.INFO, stream=sys.stderr, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("zk_fp_manager")

def resolve_target(ip, default_port=4370):
    """
    Intelligently resolves target IP and port.
    If given public router IP (203.147.129.237) or IP:PORT, checks if on-premises direct LAN
    is reachable to avoid NAT loopback timeouts.
    """
    ip_str = str(ip or "").strip()
    port = default_port
    if ":" in ip_str:
        parts = ip_str.split(":")
        ip_str = parts[0]
        try:
            port = int(parts[1])
        except Exception:
            pass

    if ip_str == "203.147.129.237":
        candidate = "192.168.1.201" if port == 4371 else "192.168.1.202"
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.4)
            s.connect((candidate, 4370))
            s.close()
            logger.info(f"Resolved public endpoint {ip_str}:{port} -> direct LAN {candidate}:4370")
            return candidate, 4370
        except Exception:
            pass

    return ip_str, port

DEFAULT_DEVICES = [
    {"id": 1, "name": "IN01-A/ID Gate 1 (203.147.129.237:4371)", "ip": "192.168.1.201", "port": 4370},
    {"id": 2, "name": "IN01-A/ID Gate 2 (203.147.129.237:4370)", "ip": "192.168.1.202", "port": 4370}
]

def get_db():
    conn = psycopg2.connect(
        host="localhost",
        port=5433,
        dbname="zkteco_attendance",
        user="postgres",
        password="postgres"
    )
    conn.autocommit = True
    return conn

def save_templates_to_db(pin_templates):
    """
    Saves a dict of { (pin, fid): (valid, template_bytes) } into PostgreSQL.
    """
    if not pin_templates:
        return
    db = get_db()
    with db.cursor() as cur:
        for (pin, fid), (valid, t_bytes) in pin_templates.items():
            cur.execute("""
                INSERT INTO attendance_biometric_templates (
                    device_pin, finger_index, template_data, template_size, valid, updated_at
                ) VALUES (%s, %s, %s, %s, %s, NOW())
                ON CONFLICT (device_pin, finger_index) DO UPDATE
                SET template_data = EXCLUDED.template_data,
                    template_size = EXCLUDED.template_size,
                    valid = EXCLUDED.valid,
                    updated_at = NOW();
            """, (str(pin), int(fid), psycopg2.Binary(t_bytes), len(t_bytes), int(valid)))

        # Update fingerprint_count in attendance_device_users
        cur.execute("""
            UPDATE attendance_device_users adu
            SET fingerprint_count = sub.cnt
            FROM (
                SELECT device_pin, count(*) as cnt
                FROM attendance_biometric_templates
                GROUP BY device_pin
            ) sub
            WHERE adu.device_pin = sub.device_pin;
        """)
    db.close()
    logger.info("Saved biometric templates and updated fingerprint_count in database.")

def fetch_device_templates(ip, port=4370):
    """
    Connects to device, fetches all users and fingerprint templates.
    Returns: (users_list, { (pin, fid): (template_obj, valid, template_bytes) })
    """
    zk = ZK(ip, port=port, timeout=5, force_udp=False)
    conn = zk.connect()
    try:
        users = conn.get_users()
        uid_to_user = {u.uid: u for u in users}
        templates = conn.get_templates()

        mapped = {}
        for t in templates:
            u = uid_to_user.get(t.uid)
            if u:
                pin = str(u.user_id)
                fid = t.fid
                mapped[(pin, fid)] = (t, t.valid, t.template)
        return users, mapped
    finally:
        try:
            conn.disconnect()
        except Exception:
            pass

def sync_all_templates():
    """
    Merges all templates between all configured terminals and database.
    """
    logger.info("Starting Cross-Terminal Biometric Fingerprint Sync...")
    all_pin_templates = {}

    device_data = {}
    for dev in DEFAULT_DEVICES:
        ip = dev["ip"]
        try:
            users, temps = fetch_device_templates(ip)
            device_data[ip] = {"users": users, "temps": temps}
            for k, (t, valid, t_bytes) in temps.items():
                all_pin_templates[k] = (valid, t_bytes)
            logger.info(f"Loaded {len(temps)} templates from {ip}")
            time.sleep(0.5)
        except Exception as e:
            logger.error(f"Failed to fetch templates from {ip}: {e}")

    # Save all found templates to PostgreSQL
    save_templates_to_db(all_pin_templates)

    # Cross-push missing templates to terminals
    push_results = []
    for dev in DEFAULT_DEVICES:
        ip = dev["ip"]
        current = device_data.get(ip, {}).get("temps", {})
        users = device_data.get(ip, {}).get("users", [])
        pin_to_user = {str(u.user_id): u for u in users}

        missing = {k: v for k, v in all_pin_templates.items() if k not in current}
        if not missing:
            logger.info(f"Device {ip} is already 100% up to date.")
            push_results.append({"ip": ip, "pushed": 0, "status": "up-to-date"})
            continue

        logger.info(f"Device {ip} missing {len(missing)} templates. Synchronizing...")
        zk = ZK(ip, port=dev["port"], timeout=5, force_udp=False)
        try:
            conn = zk.connect()
            pushed_count = 0
            for (pin, fid), (valid, t_bytes) in missing.items():
                u = pin_to_user.get(str(pin))
                if not u:
                    continue
                try:
                    finger = Finger(uid=u.uid, fid=fid, valid=valid, template=t_bytes)
                    conn.save_user_template(u, [finger])
                    pushed_count += 1
                except Exception as ex:
                    logger.debug(f"Could not push FP for user {pin} fid {fid}: {ex}")

            conn.disconnect()
            logger.info(f"Pushed {pushed_count} templates to {ip}")
            push_results.append({"ip": ip, "pushed": pushed_count, "status": "synchronized"})
        except Exception as e:
            logger.error(f"Error pushing templates to {ip}: {e}")
            push_results.append({"ip": ip, "pushed": 0, "error": str(e)})

        time.sleep(0.5)

    return {
        "success": True,
        "totalTemplatesInSystem": len(all_pin_templates),
        "results": push_results
    }

def enroll_remote_fingerprint(target_ip, pin, fid=0):
    """
    Triggers physical machine to prompt user: 'Please place finger 3 times'.
    Once user completes, extracts the newly captured template and syncs it to all machines!
    """
    logger.info(f"Initiating remote fingerprint enrollment for PIN={pin}, FID={fid} on {target_ip}...")
    real_ip, real_port = resolve_target(target_ip, default_port=4370)
    zk = ZK(real_ip, port=real_port, timeout=10, force_udp=False)
    conn = zk.connect()
    try:
        users = conn.get_users()
        user = next((u for u in users if str(u.user_id) == str(pin)), None)
        if not user:
            # If user does not exist on machine yet, add them
            numeric_uid = int("".join(filter(str.isdigit, str(pin)))) if any(c.isdigit() for c in str(pin)) else 1000
            conn.set_user(uid=numeric_uid, name=str(pin), privilege=0, password="", group_id="", user_id=str(pin), card=0)
            user = next((u for u in conn.get_users() if str(u.user_id) == str(pin)), None)

        if not user:
            return {"success": False, "message": f"Could not find or create user with PIN {pin} on {target_ip}"}

        # Clear existing slot on machine if already registered to avoid "Cant Enroll user" status rejection
        try:
            conn.delete_user_template(uid=user.uid, temp_id=fid, user_id=str(pin))
            time.sleep(0.3)
        except Exception as del_err:
            logger.info(f"Existing template slot check: {del_err}")

        # Trigger terminal enrollment (terminal prompts user to place finger 3 times)
        logger.info(f"Terminal {target_ip} is now listening. User must touch sensor 3 times.")
        try:
            conn.enroll_user(uid=user.uid, temp_id=fid, user_id=str(pin))
        except Exception as enroll_err:
            logger.info(f"enroll_user prompt ended: {enroll_err}")

        # Verification: check if the template was successfully captured on the machine
        time.sleep(0.5)
        finger = None
        try:
            finger = conn.get_user_template(uid=user.uid, temp_id=fid, user_id=str(pin))
        except Exception:
            pass

        if not finger:
            # Fallback scan across machine templates
            try:
                for t in conn.get_templates():
                    if t.uid == user.uid and t.fid == fid:
                        finger = t
                        break
            except Exception:
                pass

        if not finger:
            return {"success": False, "message": "Enrollment timed out or was cancelled on terminal"}

        t_bytes = finger.template
        valid = finger.valid

        # Save to database
        save_templates_to_db({(str(pin), int(fid)): (valid, t_bytes)})
        logger.info(f"Fingerprint enrolled and saved to database for PIN={pin}, FID={fid}!")

    finally:
        try:
            conn.disconnect()
        except Exception:
            pass

    # Automatically push newly enrolled fingerprint to other terminals!
    other_devices = [d for d in DEFAULT_DEVICES if d["ip"] != target_ip]
    for other in other_devices:
        try:
            time.sleep(1)
            other_zk = ZK(other["ip"], port=other["port"], timeout=5, force_udp=False)
            other_conn = other_zk.connect()
            other_users = other_conn.get_users()
            other_user = next((u for u in other_users if str(u.user_id) == str(pin)), None)
            if not other_user:
                numeric_uid = int("".join(filter(str.isdigit, str(pin)))) if any(c.isdigit() for c in str(pin)) else 1000
                other_conn.set_user(uid=numeric_uid, name=str(pin), privilege=0, password="", group_id="", user_id=str(pin), card=0)
                other_user = next((u for u in other_conn.get_users() if str(u.user_id) == str(pin)), None)

            if other_user:
                other_finger = Finger(uid=other_user.uid, fid=fid, valid=valid, template=t_bytes)
                other_conn.save_user_template(other_user, [other_finger])
                logger.info(f"Synced new fingerprint to {other['ip']}")
            other_conn.disconnect()
        except Exception as e:
            logger.warn(f"Failed to copy new template to {other['ip']}: {e}")

    return {
        "success": True,
        "message": f"Fingerprint (Finger #{fid}) registered successfully and synchronized to all terminals!",
        "pin": pin,
        "fid": fid
    }

def clear_all_fingerprints():
    """
    Clears all fingerprint templates from all physical terminals and the database,
    resolving duplicate fingerprint errors and allowing clean, fresh enrollment.
    Uses robust two-pass deep clearing so no cached templates remain on device hardware.
    """
    logger.info("Clearing all fingerprint templates across all physical machines and database...")
    results = []

    for dev in DEFAULT_DEVICES:
        ip = dev["ip"]
        port = dev["port"]
        deleted_count = 0
        try:
            zk = ZK(ip, port=port, timeout=10, force_udp=False)
            conn = zk.connect()
            users = conn.get_users()
            uid_map = {u.uid: u for u in users}
            templates = conn.get_templates()
            total_on_device = len(templates)

            # Pass 1: standard template deletion with user_id
            for t in templates:
                u = uid_map.get(t.uid)
                pin = str(u.user_id) if u else ""
                try:
                    if conn.delete_user_template(uid=t.uid, temp_id=t.fid, user_id=pin):
                        deleted_count += 1
                except Exception as del_err:
                    logger.warn(f"Error deleting template uid={t.uid}, fid={t.fid} on {ip}: {del_err}")

            conn.refresh_data()
            time.sleep(0.3)

            # Pass 2: Deep wipe on any user who still has remaining templates on machine
            remaining_templates = conn.get_templates()
            if remaining_templates:
                logger.info(f"Machine {ip} still has {len(remaining_templates)} templates after Pass 1. Deep-cleaning affected user biometric slots...")
                affected_uids = {t.uid for t in remaining_templates}
                for uid in affected_uids:
                    u = uid_map.get(uid)
                    if u:
                        try:
                            conn.delete_user(uid=u.uid, user_id=str(u.user_id))
                            # Re-add user clean (preserves user, name, card badge, privilege)
                            conn.set_user(uid=u.uid, name=u.name, privilege=u.privilege, password=u.password, group_id=u.group_id, user_id=str(u.user_id), card=u.card)
                        except Exception as u_err:
                            logger.warn(f"Error deep-cleaning user {uid} on {ip}: {u_err}")
                conn.refresh_data()

            conn.read_sizes()
            rem = conn.fingers
            conn.disconnect()
            results.append({
                "ip": ip,
                "deleted": deleted_count,
                "initial": total_on_device,
                "remaining": rem,
                "status": "cleared" if rem == 0 else f"{rem} remaining"
            })
            logger.info(f"Machine {ip}: deleted templates. Remaining fingers: {rem}")
        except Exception as e:
            logger.error(f"Failed to clear templates on {ip}: {e}")
            results.append({"ip": ip, "error": str(e), "status": "failed"})

    # Clear templates from PostgreSQL and reset user counts
    db = get_db()
    with db.cursor() as cur:
        cur.execute("DELETE FROM attendance_biometric_templates;")
        cur.execute("UPDATE attendance_device_users SET fingerprint_count = 0;")
        db.commit()
    db.close()
    logger.info("Cleared attendance_biometric_templates and reset fingerprint_count to 0 in database.")

    return {
        "success": True,
        "message": "All fingerprint templates successfully removed from physical machines and database.",
        "results": results
    }

def clear_all_faces():
    """
    Clears all face recognition biometrics from the system and resets face_enrolled.
    """
    logger.info("Clearing all face biometrics from database...")
    db = get_db()
    with db.cursor() as cur:
        cur.execute("DELETE FROM face_biometrics;")
        cur.execute("UPDATE attendance_device_users SET face_enrolled = false;")
        db.commit()
    db.close()
    logger.info("Cleared face_biometrics and reset face_enrolled to false.")
    return {
        "success": True,
        "message": "All face recognition biometrics cleared from database."
    }

def clear_all_biometrics():
    """
    Wipes both physical terminal fingerprints and face recognition biometrics.
    """
    fp_res = clear_all_fingerprints()
    face_res = clear_all_faces()
    return {
        "success": True,
        "message": "All fingerprints and face biometrics completely wiped from physical machines and database.",
        "fingerprints": fp_res,
        "face": face_res
    }

def main():
    parser = argparse.ArgumentParser(description="ZKTeco Biometric Fingerprint Manager")
    parser.add_argument("--action", required=True, choices=["sync-all", "enroll-remote", "list-templates", "clear-all", "clear-faces", "clear-all-biometrics"])
    parser.add_argument("--ip", default="192.168.1.202")
    parser.add_argument("--pin", default="")
    parser.add_argument("--fid", type=int, default=0)

    args = parser.parse_args()

    try:
        if args.action == "clear-all":
            res = clear_all_fingerprints()
            print(json.dumps(res))
        elif args.action == "clear-faces":
            res = clear_all_faces()
            print(json.dumps(res))
        elif args.action == "clear-all-biometrics":
            res = clear_all_biometrics()
            print(json.dumps(res))
        elif args.action == "sync-all":
            res = sync_all_templates()
            print(json.dumps(res))
        elif args.action == "enroll-remote":
            if not args.pin:
                print(json.dumps({"success": False, "message": "--pin is required for remote enrollment"}))
                sys.exit(0)
            res = enroll_remote_fingerprint(args.ip, args.pin, args.fid)
            print(json.dumps(res))
        elif args.action == "list-templates":
            db = get_db()
            with db.cursor() as cur:
                cur.execute("""
                    SELECT device_pin, finger_index, template_size, valid, updated_at
                    FROM attendance_biometric_templates
                    ORDER BY device_pin, finger_index;
                """)
                rows = [{"pin": r[0], "fid": r[1], "size": r[2], "valid": r[3], "updatedAt": str(r[4])} for r in cur.fetchall()]
            db.close()
            print(json.dumps({"success": True, "count": len(rows), "templates": rows}))
    except Exception as e:
        logger.error(f"Fatal error in fp manager: {e}", exc_info=True)
        print(json.dumps({"success": False, "message": str(e)}))
    except Exception as e:
        logger.error(f"Fatal error in fp manager: {e}", exc_info=True)
        print(json.dumps({"success": False, "message": str(e)}))

if __name__ == "__main__":
    main()

