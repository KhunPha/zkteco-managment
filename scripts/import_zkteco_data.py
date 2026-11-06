#!/usr/bin/env python3
"""
ZKTeco Biometric Backup Importer & Role Checker
Reads IN01A_backup_20261105_104822.json and fp_templates_backup_20261106_112452.json,
checks roles/privileges, and imports devices, employees, device users, and attendance logs
into the zkteco_attendance PostgreSQL database.
"""

import json
import hashlib
import os
import subprocess
import sys
from datetime import datetime

BACKUP_JSON_PATH = "IN01A_backup_20261105_104822.json"
FP_BACKUP_PATH = os.path.join("backups", "fp_templates_backup_20261106_112452.json")
OUTPUT_SQL_PATH = "scripts/import_data.sql"

def clean_name(raw_name):
    if not raw_name:
        return "Unknown"
    raw_name = raw_name.strip()
    if "." in raw_name:
        parts = raw_name.split(".")
        candidate = parts[0].strip()
        if candidate:
            return candidate
    return raw_name

def escape_sql(val):
    if val is None:
        return "NULL"
    s = str(val).replace("'", "''")
    return f"'{s}'"

def main():
    print("=" * 70)
    print("ZKTECO DATA IMPORT & ROLE CHECKER")
    print("=" * 70)

    if not os.path.exists(BACKUP_JSON_PATH):
        print(f"Error: {BACKUP_JSON_PATH} not found!")
        sys.exit(1)

    print(f"Loading {BACKUP_JSON_PATH}...")
    with open(BACKUP_JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    device = data.get("device", {})
    users = data.get("users", [])
    attendance = data.get("attendance", [])
    fingerprints = data.get("fingerprints", [])

    print(f"Found Device: Model={device.get('model')}, Serial={device.get('serial')}, IP={device.get('ip')}")
    print(f"Found Users: {len(users):,}")
    print(f"Found Attendance Punches: {len(attendance):,}")
    print(f"Found Fingerprint entries in device backup: {len(fingerprints):,}")

    # Build Fingerprint count map
    uid_to_pin = {}
    for u in users:
        uid_to_pin[u.get("uid")] = str(u.get("user_id")).strip()

    fp_counts = {}
    for fp in fingerprints:
        pin = uid_to_pin.get(fp.get("uid"))
        if pin:
            fp_counts[pin] = fp_counts.get(pin, 0) + 1

    if os.path.exists(FP_BACKUP_PATH):
        print(f"Loading additional fingerprint templates from {FP_BACKUP_PATH}...")
        with open(FP_BACKUP_PATH, "r", encoding="utf-8") as f:
            fp2 = json.load(f)
        print(f"Found {len(fp2)} additional templates.")
        for item in fp2:
            p = str(item.get("pin")).strip()
            fp_counts[p] = fp_counts.get(p, 0) + 1

    print(f"Total distinct users with fingerprints: {len(fp_counts)}")

    # Role Checking Analysis
    role_groups = {"ADMIN": [], "ENROLLER": [], "NORMAL_USER": []}
    for u in users:
        priv = u.get("privilege", 0)
        pin = str(u.get("user_id")).strip()
        name = clean_name(u.get("name"))
        card = u.get("card", 0)

        if priv == 8:
            role_groups["ADMIN"].append({"pin": pin, "name": name, "card": card, "priv": priv})
        elif priv == 6:
            role_groups["ENROLLER"].append({"pin": pin, "name": name, "card": card, "priv": priv})
        else:
            role_groups["NORMAL_USER"].append({"pin": pin, "name": name, "card": card, "priv": priv})

    print("-" * 70)
    print("ROLE VERIFICATION SUMMARY:")
    print(f"  • Master Administrators (privilege=8): {len(role_groups['ADMIN'])}")
    for a in role_groups["ADMIN"][:5]:
        print(f"     - PIN: {a['pin']}, Name: {a['name']}, Card: {a['card']}")
    if len(role_groups["ADMIN"]) > 5:
        print(f"     ... and {len(role_groups['ADMIN']) - 5} more")

    print(f"  • Enrollers / Managers (privilege=6): {len(role_groups['ENROLLER'])}")
    for e in role_groups["ENROLLER"]:
        print(f"     - PIN: {e['pin']}, Name: {e['name']}, Card: {e['card']}")

    print(f"  • Standard Users / Employees (privilege=0): {len(role_groups['NORMAL_USER'])}")
    print("-" * 70)

    # Generate SQL file
    print(f"Generating SQL statements in {OUTPUT_SQL_PATH}...")
    os.makedirs(os.path.dirname(OUTPUT_SQL_PATH), exist_ok=True)

    with open(OUTPUT_SQL_PATH, "w", encoding="utf-8") as out:
        out.write("-- ZKTeco Backup Data Import\n")
        out.write("BEGIN;\n\n")

        # 1. Register Device
        serial = device.get("serial", "BYRQ211860043")
        model = device.get("model", "IN01-A")
        ip = device.get("ip", "192.168.1.202")
        out.write(f"""
-- 1. Device Registration
INSERT INTO attendance_devices (
    serial_number, name, model, ip_address, port, comm_key, integration_type,
    location, connection_status, is_active, last_communication, created_at, updated_at
) VALUES (
    {escape_sql(serial)}, 'IN01-A Main Terminal', {escape_sql(model)}, {escape_sql(ip)}, 4370, '0', 'TCP_PULL',
    'Main Gate / Reception', 'ONLINE', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT (serial_number) DO UPDATE SET
    name = EXCLUDED.name,
    model = EXCLUDED.model,
    ip_address = EXCLUDED.ip_address,
    connection_status = 'ONLINE',
    last_communication = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP;
\n""")

        # 2. Insert Employees
        out.write("-- 2. Employees Insertion\n")
        for u in users:
            pin = str(u.get("user_id")).strip()
            c_name = clean_name(u.get("name"))
            priv = u.get("privilege", 0)
            dept_id = 1 if priv >= 6 else 4  # 1=Management, 4=Academic/General

            out.write(f"""
INSERT INTO employees (
    employee_code, english_name, gender, employment_type,
    employment_start_date, employment_status, branch_id, department_id,
    created_at, updated_at
) VALUES (
    {escape_sql(pin)}, {escape_sql(c_name)}, 'OTHER', 'FULL_TIME',
    '2024-01-01', 'ACTIVE', 1, {dept_id},
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT (employee_code) DO UPDATE SET
    english_name = EXCLUDED.english_name,
    updated_at = CURRENT_TIMESTAMP;
""")

        # 3. Insert Attendance Device Users
        out.write("\n-- 3. Attendance Device Users Insertion\n")
        for u in users:
            pin = str(u.get("user_id")).strip()
            raw_name = u.get("name", "")
            priv = u.get("privilege", 0)
            card = u.get("card", 0)
            pwd = u.get("password", "")

            if priv == 8:
                priv_str = "ADMIN"
            elif priv == 6:
                priv_str = "ENROLLER"
            else:
                priv_str = "NORMAL_USER"

            card_val = escape_sql(str(card)) if card and card != 0 else "NULL"
            pwd_val = escape_sql(pwd) if pwd and str(pwd).lower() != "no" else "NULL"
            fp_cnt = fp_counts.get(pin, 0)

            out.write(f"""
INSERT INTO attendance_device_users (
    device_id, device_pin, employee_id, name_on_device, privilege,
    card_number, password, face_enrolled, fingerprint_count, sync_status,
    last_synced_at, created_at, updated_at
) VALUES (
    (SELECT id FROM attendance_devices WHERE serial_number = {escape_sql(serial)}),
    {escape_sql(pin)},
    (SELECT id FROM employees WHERE employee_code = {escape_sql(pin)}),
    {escape_sql(raw_name)},
    '{priv_str}',
    {card_val},
    {pwd_val},
    FALSE,
    {fp_cnt},
    'SYNCED',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT (device_id, device_pin) DO UPDATE SET
    name_on_device = EXCLUDED.name_on_device,
    privilege = EXCLUDED.privilege,
    card_number = EXCLUDED.card_number,
    password = EXCLUDED.password,
    fingerprint_count = EXCLUDED.fingerprint_count,
    sync_status = 'SYNCED',
    last_synced_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP;
""")

        # 4. Insert Attendance Raw Logs (Batched)
        out.write("\n-- 4. Attendance Raw Logs Insertion\n")
        for log in attendance:
            pin = str(log.get("user_id")).strip()
            ts_str = log.get("timestamp", "").strip()
            if not ts_str:
                continue

            status = log.get("status", 4)
            punch = log.get("punch", 0)

            # verify_type
            if status == 1:
                verify_type = "FINGERPRINT"
            elif status == 4:
                verify_type = "CARD"
            else:
                verify_type = "OTHER"

            # punch_state
            if punch == 0:
                punch_state = "CHECK_IN"
            elif punch == 1:
                punch_state = "CHECK_OUT"
            elif punch == 4:
                punch_state = "OVERTIME_IN"
            elif punch == 5:
                punch_state = "OVERTIME_OUT"
            else:
                punch_state = "CHECK_IN"

            # UTC punch time
            # Timestamps are Asia/Phnom_Penh (UTC+7)
            # Format: 'YYYY-MM-DD HH:mm:ss+07'
            ts_formatted = ts_str.replace("T", " ")
            if "+" not in ts_formatted and "Z" not in ts_formatted:
                ts_sql = f"'{ts_formatted}+07'"
            else:
                ts_sql = f"'{ts_formatted}'"

            # SHA-256 idempotency key
            raw_key = f"{serial}_{pin}_{ts_str}"
            idempotency_key = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

            out.write(f"""
INSERT INTO attendance_raw_logs (
    device_id, device_sn, device_pin, punch_time, verify_type,
    punch_state, idempotency_key, processed, created_at
) VALUES (
    (SELECT id FROM attendance_devices WHERE serial_number = {escape_sql(serial)}),
    {escape_sql(serial)},
    {escape_sql(pin)},
    {ts_sql}::timestamptz,
    '{verify_type}',
    '{punch_state}',
    '{idempotency_key}',
    FALSE,
    CURRENT_TIMESTAMP
) ON CONFLICT (idempotency_key) DO NOTHING;
""")

        out.write("\nCOMMIT;\n")

    print(f"SQL generated successfully. File size: {os.path.getsize(OUTPUT_SQL_PATH):,} bytes.")
    print("Copying SQL into zkteco-postgres container and executing...")

    subprocess.run(["docker", "cp", OUTPUT_SQL_PATH, "zkteco-postgres:/tmp/import_data.sql"], check=True)
    res = subprocess.run(
        ["docker", "exec", "zkteco-postgres", "psql", "-U", "postgres", "-d", "zkteco_attendance", "-f", "/tmp/import_data.sql", "-q"],
        capture_output=True,
        text=True
    )

    if res.returncode != 0:
        print("Error executing SQL:")
        print(res.stderr[:1000])
        sys.exit(1)
    else:
        print("Database import completed successfully!")

    # Verify counts in DB
    check_cmd = subprocess.run(
        ["docker", "exec", "zkteco-postgres", "psql", "-U", "postgres", "-d", "zkteco_attendance", "-c",
         "SELECT (SELECT count(*) FROM attendance_devices) as devices, "
         "(SELECT count(*) FROM employees) as employees, "
         "(SELECT count(*) FROM attendance_device_users) as device_users, "
         "(SELECT count(*) FROM attendance_raw_logs) as raw_logs, "
         "(SELECT count(*) FROM attendance_device_users WHERE privilege = 'ADMIN') as admin_users, "
         "(SELECT count(*) FROM attendance_device_users WHERE privilege = 'ENROLLER') as enroller_users;"],
        capture_output=True,
        text=True
    )
    print("\nDATABASE STATUS AFTER IMPORT:")
    print(check_cmd.stdout)

if __name__ == "__main__":
    main()
