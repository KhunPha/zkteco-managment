#!/usr/bin/env python3
"""
Import all users from IN01A_backup JSON into the ZKTeco Management System.
Creates Employee records + Device User mappings (linked to Device ID 2 = 192.168.1.202).
"""

import json
import time
import sys
import urllib.request
import urllib.error
from pathlib import Path

# ─── Configuration ────────────────────────────────────────────────────────────
BACKUP_FILE   = Path(__file__).parent.parent / "IN01A_backup_20261105_104822.json"
BACKEND_URL   = "http://localhost:8484"
USERNAME      = "admin"
PASSWORD      = "Admin@123456"
DEVICE_ID     = 2          # 192.168.1.202  IN01-A/ID  SN:BYRQ211860043
DEVICE_1_ID   = 1          # 192.168.1.201  IN01-A/ID  SN:BYRQ222260008
START_DATE    = "2026-11-05"
GENDER_DEFAULT = "MALE"
# ──────────────────────────────────────────────────────────────────────────────

def api_post(url, data, token=None):
    body = json.dumps(data).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=body, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))

def api_get(url, token):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


def login():
    res = api_post(f"{BACKEND_URL}/api/v1/auth/login",
                   {"username": USERNAME, "password": PASSWORD})
    token = res["data"]["accessToken"]
    print(f"[✓] Logged in as {USERNAME}")
    return token


def load_existing(token):
    """Return sets of already-registered employee codes and device pins."""
    emp_codes = set()
    dev_pins  = set()

    page = 0
    while True:
        r = api_get(f"{BACKEND_URL}/api/v1/employees?size=200&page={page}", token)
        for e in r["data"]["content"]:
            emp_codes.add(str(e["employeeCode"]))
        if r["data"]["last"]:
            break
        page += 1

    page = 0
    while True:
        r = api_get(f"{BACKEND_URL}/api/v1/device-users?deviceId={DEVICE_ID}&size=200&page={page}", token)
        for u in r["data"]["content"]:
            dev_pins.add(str(u["devicePin"]))
        if r["data"]["last"]:
            break
        page += 1

    print(f"[i] Already in system: {len(emp_codes)} employees, {len(dev_pins)} device-user entries on device {DEVICE_ID}")
    return emp_codes, dev_pins


def clean_name(raw: str) -> str:
    """The backup stores names like 'LAM VANNXING.LAM VANNXIN' – take the first part."""
    if "." in raw:
        return raw.split(".")[0].strip()
    return raw.strip()


def infer_gender(name: str) -> str:
    """Very rough heuristic – default MALE unless name suggests otherwise."""
    female_hints = ["SOPHEA", "SOPHA", "SREYMOM", "SREY", "PISEY", "CHANTHY",
                    "KIMHENG", "KIMHEANG", "VANNA", "RATANA", "CHANNY", "DARA",
                    "LINDA", "JULINA", "CHANSONITA", "VANNXIN"]
    name_upper = name.upper()
    for hint in female_hints:
        if hint in name_upper:
            return "FEMALE"
    return "MALE"


def import_users(token, users, existing_emp_codes, existing_dev_pins):
    total      = len(users)
    created_emp = 0
    created_du  = 0
    skipped     = 0
    errors      = []

    for idx, user in enumerate(users, 1):
        pin     = str(user.get("user_id", "")).strip()
        raw_name= str(user.get("name", "")).strip()
        card    = int(user.get("card", 0))
        priv    = user.get("privilege", 0)
        pwd     = str(user.get("password", "")).strip()
        if pwd.lower() in ("no", "none", ""):
            pwd = ""

        if not pin or not raw_name:
            skipped += 1
            continue

        name = clean_name(raw_name)
        privilege_str = "SUPER_ADMIN" if priv == 14 else "NORMAL_USER"
        card_str = str(card) if card and card > 0 else ""

        # Progress every 50 records
        if idx % 50 == 0 or idx == total:
            print(f"  [{idx}/{total}] Processing PIN {pin} – {name} ...", flush=True)

        # ── 1. Create Employee if not already registered ───────────────────
        emp_id = None
        if pin not in existing_emp_codes:
            try:
                payload = {
                    "employeeCode"       : pin,
                    "englishName"        : name,
                    "gender"             : infer_gender(name),
                    "employmentStartDate": START_DATE,
                    "employmentType"     : "FULL_TIME",
                    "employmentStatus"   : "ACTIVE",
                }
                resp = api_post(f"{BACKEND_URL}/api/v1/employees", payload, token)
                emp_id = resp["data"]["id"]
                existing_emp_codes.add(pin)
                created_emp += 1
            except urllib.error.HTTPError as e:
                body = e.read().decode("utf-8", errors="replace")
                if e.code == 409 or "duplicate" in body.lower() or "already" in body.lower():
                    skipped += 1
                else:
                    errors.append(f"Employee PIN {pin}: HTTP {e.code} – {body[:120]}")
                # Try to look up existing employee anyway
        else:
            skipped += 1

        # ── 2. Create Device User mapping for Device 2 ─────────────────────
        if pin not in existing_dev_pins:
            try:
                du_payload = {
                    "deviceId"        : DEVICE_ID,
                    "devicePin"       : pin,
                    "nameOnDevice"    : name[:24],   # device name field is max 24 chars
                    "privilege"       : privilege_str,
                    "cardNumber"      : card_str,
                    "password"        : pwd[:8],
                    "faceEnrolled"    : False,
                    "fingerprintCount": 0,
                }
                if emp_id:
                    du_payload["employeeId"] = emp_id

                api_post(f"{BACKEND_URL}/api/v1/device-users", du_payload, token)
                existing_dev_pins.add(pin)
                created_du += 1
            except urllib.error.HTTPError as e:
                body = e.read().decode("utf-8", errors="replace")
                if e.code != 409:
                    errors.append(f"DeviceUser PIN {pin}: HTTP {e.code} – {body[:120]}")

        # Small sleep every 100 to avoid overwhelming the API
        if idx % 100 == 0:
            time.sleep(0.3)

    return created_emp, created_du, skipped, errors


def main():
    print("=" * 60)
    print("ZKTeco Management – Bulk User Import")
    print("=" * 60)

    if not BACKUP_FILE.exists():
        print(f"[✗] Backup file not found: {BACKUP_FILE}")
        sys.exit(1)

    print(f"[i] Loading backup: {BACKUP_FILE.name}")
    with open(BACKUP_FILE, encoding="utf-8") as f:
        data = json.load(f)

    users = data.get("users", [])
    print(f"[i] Users in backup: {len(users)}")
    print(f"[i] Target device  : Device ID {DEVICE_ID} (192.168.1.202)")
    print()

    token = login()

    print("[i] Loading existing records from system …")
    existing_emp_codes, existing_dev_pins = load_existing(token)
    print()

    print(f"[→] Starting import …")
    t_start = time.time()
    created_emp, created_du, skipped, errors = import_users(
        token, users, existing_emp_codes, existing_dev_pins
    )
    elapsed = time.time() - t_start

    print()
    print("=" * 60)
    print("Import Complete!")
    print(f"  New Employees created     : {created_emp}")
    print(f"  New Device Users created  : {created_du}")
    print(f"  Skipped (already existed) : {skipped}")
    print(f"  Errors                    : {len(errors)}")
    print(f"  Time taken                : {elapsed:.1f}s")
    print("=" * 60)

    if errors:
        print(f"\n[!] First {min(10, len(errors))} errors:")
        for e in errors[:10]:
            print(f"    {e}")

    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())

