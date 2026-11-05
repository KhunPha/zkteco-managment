#!/usr/bin/env python3
"""
Sync employees & device-users EXACTLY to match IN01A_backup JSON.

Steps:
  1. Load all backup user_ids (the "source of truth").
  2. Delete any employee (and their device-user rows) whose employeeCode is NOT in the backup.
  3. For each backup user, create the employee if missing and create/update the device-user row.
  4. Print a full summary.
"""

import json
import time
import sys
import urllib.request
import urllib.error
from pathlib import Path

# ─── Configuration ───────────────────────────────────────────────────────────
BACKUP_FILE   = Path(__file__).parent.parent / "IN01A_backup_20261105_104822.json"
BACKEND_URL   = "http://localhost:8484"
USERNAME      = "admin"
PASSWORD      = "Admin@123456"
DEVICE_ID     = 2          # 192.168.1.202  IN01-A/ID  SN:BYRQ211860043
START_DATE    = "2026-11-05"
# ─────────────────────────────────────────────────────────────────────────────


# ── HTTP helpers ──────────────────────────────────────────────────────────────
def _request(method, url, data=None, token=None, timeout=12):
    body = json.dumps(data).encode() if data is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())

def api_get(url, token):    return _request("GET",    url, token=token)
def api_post(url, d, tok):  return _request("POST",   url, data=d, token=tok)
def api_delete(url, token):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"}, method="DELETE")
    with urllib.request.urlopen(req, timeout=12) as r:
        return r.status


# ── Pagination helper ─────────────────────────────────────────────────────────
def paginate(base_url, token, size=200):
    page, items = 0, []
    while True:
        sep = "&" if "?" in base_url else "?"
        r = api_get(f"{base_url}{sep}size={size}&page={page}", token)
        items.extend(r["data"]["content"])
        if r["data"]["last"]:
            break
        page += 1
    return items


# ── Name helpers ──────────────────────────────────────────────────────────────
def clean_name(raw):
    return (raw.split(".")[0] if "." in raw else raw).strip()

def infer_gender(name):
    female = ["SOPHEA","SOPHA","SREYMOM","SREY","PISEY","CHANTHY",
              "KIMHENG","KIMHEANG","VANNA","RATANA","CHANNY","DARA",
              "LINDA","JULINA","CHANSONITA","VANNXIN","NEATH","SREYLEAK",
              "SREYNICH","SREYNEANG","LINA","NINA","MONY","CHANNARY",
              "MOLIKA","THIDA","SOPHEAP","SOKHOM","SOKHA"]
    n = name.upper()
    return "FEMALE" if any(h in n for h in female) else "MALE"


# ─────────────────────────────────────────────────────────────────────────────
def main():
    print("=" * 65)
    print("  ZKTeco Management – Sync Employees & Device Users from Backup")
    print("=" * 65)

    # 1. Load backup
    if not BACKUP_FILE.exists():
        print(f"[✗] Backup file not found: {BACKUP_FILE}"); sys.exit(1)
    with open(BACKUP_FILE, encoding="utf-8") as f:
        data = json.load(f)
    backup_users = data.get("users", [])
    backup_pins  = {str(u["user_id"]).strip() for u in backup_users
                    if str(u.get("user_id", "")).strip()}
    print(f"[i] Backup users   : {len(backup_users)}")
    print(f"[i] Unique PINs    : {len(backup_pins)}")
    print()

    # 2. Login
    res   = api_post(f"{BACKEND_URL}/api/v1/auth/login",
                     {"username": USERNAME, "password": PASSWORD}, None)
    token = res["data"]["accessToken"]
    print(f"[✓] Logged in as {USERNAME}")

    # 3. Fetch all current employees & device-users
    print("[i] Fetching current employees from system …")
    all_emp = paginate(f"{BACKEND_URL}/api/v1/employees", token)
    print(f"    Found {len(all_emp)} employees in system")

    print("[i] Fetching current device-users from system …")
    all_du  = paginate(f"{BACKEND_URL}/api/v1/device-users", token)
    print(f"    Found {len(all_du)} device-user rows in system")
    print()

    # Build lookup maps
    emp_by_code  = {str(e["employeeCode"]): e for e in all_emp}
    du_by_pin    = {}   # pin → list of device-user rows (across all devices)
    for du in all_du:
        du_by_pin.setdefault(str(du["devicePin"]), []).append(du)

    # ── STEP A: Delete employees NOT in backup ────────────────────────────────
    to_delete_emp = [e for e in all_emp if str(e["employeeCode"]) not in backup_pins]
    print(f"[→] Employees to DELETE (not in backup) : {len(to_delete_emp)}")
    deleted_emp = 0
    deleted_du  = 0
    for emp in to_delete_emp:
        code = str(emp["employeeCode"])
        # First delete their device-user rows
        for du in du_by_pin.get(code, []):
            try:
                api_delete(f"{BACKEND_URL}/api/v1/device-users/{du['id']}", token)
                deleted_du += 1
            except Exception as ex:
                print(f"  [!] Could not delete device-user {du['id']}: {ex}")
        # Then delete the employee
        try:
            api_delete(f"{BACKEND_URL}/api/v1/employees/{emp['id']}", token)
            deleted_emp += 1
            print(f"  [-] Deleted employee: {code} – {emp.get('englishName','')}")
        except Exception as ex:
            print(f"  [!] Could not delete employee {emp['id']} ({code}): {ex}")

    print(f"    Deleted {deleted_emp} employees, {deleted_du} device-user rows")
    print()

    # ── STEP B: Import/create missing employees + device-users ────────────────
    # Refresh lookups after deletions
    emp_by_code = {k: v for k, v in emp_by_code.items() if k in backup_pins}
    du_pins_on_device2 = {
        str(du["devicePin"])
        for du in all_du
        if int(du["deviceId"]) == DEVICE_ID
    }

    print(f"[→] Importing backup users …")
    t0 = time.time()
    created_emp = created_du = skipped = 0
    errors = []

    for idx, user in enumerate(backup_users, 1):
        pin      = str(user.get("user_id", "")).strip()
        raw_name = str(user.get("name", "")).strip()
        card     = int(user.get("card", 0))
        priv     = user.get("privilege", 0)
        pwd      = str(user.get("password", ""))
        if pwd.lower() in ("no", "none", ""):
            pwd = ""

        if not pin or not raw_name:
            skipped += 1; continue

        name     = clean_name(raw_name)
        priv_str = "SUPER_ADMIN" if priv == 14 else "NORMAL_USER"
        card_str = str(card) if card and card > 0 else ""

        if idx % 100 == 0 or idx == len(backup_users):
            print(f"  [{idx}/{len(backup_users)}] PIN {pin} – {name}", flush=True)

        # Create employee if missing
        emp_id = emp_by_code.get(pin, {}).get("id") if pin in emp_by_code else None
        if emp_id is None:
            try:
                r = api_post(f"{BACKEND_URL}/api/v1/employees", {
                    "employeeCode"       : pin,
                    "englishName"        : name,
                    "gender"             : infer_gender(name),
                    "employmentStartDate": START_DATE,
                    "employmentType"     : "FULL_TIME",
                    "employmentStatus"   : "ACTIVE",
                }, token)
                emp_id = r["data"]["id"]
                emp_by_code[pin] = r["data"]
                created_emp += 1
            except urllib.error.HTTPError as e:
                body = e.read().decode(errors="replace")
                if e.code == 409 or "duplicate" in body.lower() or "already" in body.lower():
                    skipped += 1
                else:
                    errors.append(f"Employee {pin}: {e.code} – {body[:100]}")
        else:
            skipped += 1  # employee already existed

        # Create device-user if missing on device 2
        if pin not in du_pins_on_device2:
            try:
                payload = {
                    "deviceId"        : DEVICE_ID,
                    "devicePin"       : pin,
                    "nameOnDevice"    : name[:24],
                    "privilege"       : priv_str,
                    "cardNumber"      : card_str,
                    "password"        : pwd[:8],
                    "faceEnrolled"    : False,
                    "fingerprintCount": 0,
                }
                if emp_id:
                    payload["employeeId"] = emp_id
                api_post(f"{BACKEND_URL}/api/v1/device-users", payload, token)
                du_pins_on_device2.add(pin)
                created_du += 1
            except urllib.error.HTTPError as e:
                body = e.read().decode(errors="replace")
                if e.code != 409:
                    errors.append(f"DeviceUser {pin}: {e.code} – {body[:100]}")

        if idx % 100 == 0:
            time.sleep(0.2)

    elapsed = time.time() - t0

    # ── Final verification ────────────────────────────────────────────────────
    print()
    all_emp_final = paginate(f"{BACKEND_URL}/api/v1/employees", token)
    all_du_final  = paginate(f"{BACKEND_URL}/api/v1/device-users", token)

    print("=" * 65)
    print("  SYNC COMPLETE")
    print("=" * 65)
    print(f"  Employees deleted (not in backup)  : {deleted_emp}")
    print(f"  Device-users deleted               : {deleted_du}")
    print(f"  New employees created              : {created_emp}")
    print(f"  New device-user rows created       : {created_du}")
    print(f"  Skipped (already existed)          : {skipped}")
    print(f"  Errors                             : {len(errors)}")
    print(f"  Time taken                         : {elapsed:.1f}s")
    print()
    print(f"  Final employee count in system     : {len(all_emp_final)}")
    print(f"  Final device-user count in system  : {len(all_du_final)}")
    print("=" * 65)

    if errors:
        print(f"\n[!] First {min(10,len(errors))} errors:")
        for e in errors[:10]:
            print(f"    {e}")

    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())

