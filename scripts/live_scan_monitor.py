#!/usr/bin/env python3
"""
Live Scan Monitor & Debugger.
Connects directly to the PostgreSQL database and watches for new scans in real time,
displaying full employee information, card number, terminal, and verification method.
"""

import time
import psycopg2
from datetime import datetime

DB_URL = "postgresql://postgres:postgres@localhost:5433/zkteco_attendance"

def main():
    print("=" * 70)
    print("  🟢 ZKTECO LIVE SCAN DEBUGGER - WAITING FOR CARD / FINGERPRINT...")
    print("  Swipe your RFID card or place finger on any physical machine now.")
    print("  Press Ctrl+C to stop.")
    print("=" * 70)

    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("SELECT COALESCE(MAX(id), 0) FROM attendance_raw_logs;")
    last_id = cur.fetchone()[0]
    print(f"Current highest raw log ID in database: {last_id}")
    print("-" * 70)

    try:
        while True:
            cur.execute("""
                SELECT 
                    r.id,
                    r.punch_time,
                    r.device_pin,
                    r.device_sn,
                    r.verify_type,
                    r.punch_state,
                    e.english_name,
                    e.employee_code,
                    d.name AS device_name
                FROM attendance_raw_logs r
                LEFT JOIN employees e ON (e.employee_code = r.device_pin AND e.deleted_at IS NULL)
                LEFT JOIN attendance_devices d ON d.serial_number = r.device_sn
                WHERE r.id > %s
                ORDER BY r.id ASC;
            """, (last_id,))

            rows = cur.fetchall()
            for row in rows:
                raw_id, punch_time, pin, sn, verify, state, name, code, dev_name = row
                last_id = raw_id
                print(f"\n🔔 [NEW SCAN DETECTED at {datetime.now().strftime('%H:%M:%S')}]")
                print(f"  • Log ID        : #{raw_id}")
                print(f"  • Machine       : {dev_name or sn} (SN: {sn})")
                print(f"  • Device PIN    : {pin}")
                print(f"  • Employee Name : {name or 'Unregistered / Unknown'}")
                print(f"  • Employee Code : {code or 'N/A'}")
                print(f"  • Punch Time    : {punch_time}")
                print(f"  • Verify Method : {verify}")
                print(f"  • Punch State   : {state}")
                print(f"  ✅ Saved to PostgreSQL database successfully!")
                print("-" * 70)

            time.sleep(1)
    except KeyboardInterrupt:
        print("\nDebugger stopped.")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
