#!/usr/bin/env python3
"""
Populate shifts, assign departments & positions (Teachers, Students, Staff),
register Students in the students table, and create comprehensive schedules
for all employees, teachers, and students.
"""

import psycopg2
import sys
from datetime import date

def main():
    conn = psycopg2.connect("host=localhost port=5433 dbname=zkteco_attendance user=postgres password=postgres")
    conn.autocommit = False
    cur = conn.cursor()

    try:
        # 1. Ensure SHIFT_STUDENT exists in shifts
        print("[1/5] Verifying shifts...")
        cur.execute("""
            INSERT INTO shifts (code, name, start_time, end_time, break_start, break_end, grace_late_minutes, grace_early_leave_minutes, work_hours, is_overnight, is_flexible, requires_checkout, is_active)
            VALUES ('SHIFT_STUDENT', 'Student Regular Academic Shift', '07:30:00', '16:30:00', '11:30:00', '13:00:00', 15, 15, 7.0, FALSE, FALSE, TRUE, TRUE)
            ON CONFLICT (code) DO NOTHING;
        """)

        # Fetch shift IDs
        cur.execute("SELECT code, id FROM shifts;")
        shift_map = dict(cur.fetchall())
        shift_morning_id = shift_map["SHIFT_MORNING"]
        shift_teacher_id = shift_map["SHIFT_TEACHER"]
        shift_student_id = shift_map["SHIFT_STUDENT"]
        print(f"  Shifts available: MORNING={shift_morning_id}, TEACHER={shift_teacher_id}, STUDENT={shift_student_id}")

        # 2. Assign Teachers & Faculty in employees table
        print("[2/5] Assigning Teachers to Academic Affairs Department...")
        # PINs 2000-2099 are Academic Faculty (except 40001 Lanh Sopha and 2001 Chhong Sanrith which are in IT)
        cur.execute("""
            UPDATE employees
            SET department_id = 4, position_id = 4, branch_id = 1
            WHERE (employee_code ~ '^20[0-9]{2}$' AND employee_code NOT IN ('2001', '40001'))
               OR position_id = 4
               OR department_id = 4;
        """)
        teachers_updated = cur.rowcount
        print(f"  Assigned {teachers_updated} teachers to Department 4 (Academic Affairs, Lecturer/Instructor).")

        # General Staff & IT (Lanh Sopha 40001, Chhong Sanrith 2001)
        cur.execute("""
            UPDATE employees
            SET department_id = 3, position_id = 3, branch_id = 1
            WHERE employee_code IN ('40001', '2001');
        """)

        # 3. Populate Students Table
        print("[3/5] Populating students table with student records...")
        # Employees with codes other than staff/teachers (e.g. 1000-1999, 23000+, 30000+)
        cur.execute("""
            SELECT id, employee_code, english_name, khmer_name, gender
            FROM employees
            WHERE department_id IS NULL OR department_id NOT IN (1, 2, 3, 4);
        """)
        student_candidates = cur.fetchall()
        print(f"  Found {len(student_candidates)} candidate students from imported personnel.")

        students_inserted = 0
        for emp_id, code, eng_name, khm_name, gender in student_candidates:
            # Determine Class and Grade based on code
            c_int = int(code) if code.isdigit() else 0
            if c_int >= 32000:
                cls, grd = "Class 12A", "Grade 12"
            elif c_int >= 31000:
                cls, grd = "Class 12B", "Grade 12"
            elif c_int >= 30000:
                cls, grd = "Class 11A", "Grade 11"
            elif c_int >= 23000:
                cls, grd = "Class 10A", "Grade 10"
            elif c_int >= 20000:
                cls, grd = "Class 10B", "Grade 10"
            elif c_int >= 1500:
                cls, grd = "Class 9A", "Grade 9"
            elif c_int >= 1000:
                cls, grd = "Class 8A", "Grade 8"
            else:
                cls, grd = "Class 7A", "Grade 7"

            g = gender if gender in ("MALE", "FEMALE") else "MALE"
            contact = f"+855 12 {100000 + (emp_id % 899999)}"

            cur.execute("""
                INSERT INTO students (student_code, english_name, khmer_name, gender, class_name, grade, academic_year, parent_contact, status)
                VALUES (%s, %s, %s, %s, %s, %s, '2026-2027', %s, 'ACTIVE')
                ON CONFLICT (student_code) DO UPDATE
                SET english_name = EXCLUDED.english_name,
                    class_name = EXCLUDED.class_name,
                    grade = EXCLUDED.grade
                RETURNING id;
            """, (code, eng_name, khm_name, g, cls, grd, contact))
            student_id = cur.fetchone()[0]

            # Link student to attendance_device_users
            cur.execute("""
                UPDATE attendance_device_users
                SET student_id = %s
                WHERE device_pin = %s;
            """, (student_id, code))

            students_inserted += 1

        print(f"  Populated/Updated {students_inserted} students in students table.")

        # 4. Generate Schedules for All Employees, Teachers, and Students
        print("[4/5] Generating schedules for all personnel...")
        # Clear existing to avoid duplicate conflicts
        cur.execute("DELETE FROM employee_schedules;")

        # Fetch all active employees
        cur.execute("SELECT id, employee_code, department_id FROM employees WHERE deleted_at IS NULL;")
        all_emps = cur.fetchall()

        schedules_to_insert = []
        eff_from = date(2026, 11, 1)

        for emp_id, emp_code, dept_id in all_emps:
            if dept_id == 4:
                # Teacher
                shift_id = shift_teacher_id
            elif dept_id in (1, 2, 3) or emp_code in ('40001', '2001'):
                # General Staff / IT / Management
                shift_id = shift_morning_id
            else:
                # Student Cohort
                shift_id = shift_student_id

            schedules_to_insert.append((
                emp_id, shift_id, eff_from, True, True, True, True, True, False, False
            ))

        cur.executemany("""
            INSERT INTO employee_schedules (
                employee_id, shift_id, effective_from,
                monday, tuesday, wednesday, thursday, friday, saturday, sunday
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, schedules_to_insert)

        print(f"  Assigned {len(schedules_to_insert)} schedules successfully!")

        # Commit all changes
        conn.commit()
        print("[5/5] All shifts, personnel mappings, and schedules committed to PostgreSQL!")

    except Exception as e:
        conn.rollback()
        print(f"Error during execution: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()

