-- =============================================================================
-- V2: Organization, Personnel (Employees, Students, Departments, Positions, Branches)
-- =============================================================================

CREATE TABLE IF NOT EXISTS branches (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    parent_id BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS positions (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    khmer_name VARCHAR(150),
    english_name VARCHAR(150) NOT NULL,
    gender VARCHAR(10) NOT NULL, -- MALE, FEMALE, OTHER
    date_of_birth DATE,
    email VARCHAR(150),
    phone_number VARCHAR(50),
    address TEXT,
    department_id BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    position_id BIGINT REFERENCES positions(id) ON DELETE SET NULL,
    branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
    employment_type VARCHAR(50) NOT NULL DEFAULT 'FULL_TIME', -- FULL_TIME, PART_TIME, CONTRACT, INTERN
    employment_start_date DATE NOT NULL,
    employment_end_date DATE,
    employment_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, PROBATION, SUSPENDED, TERMINATED, RESIGNED
    profile_image_url TEXT,
    supervisor_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS students (
    id BIGSERIAL PRIMARY KEY,
    student_code VARCHAR(50) NOT NULL UNIQUE,
    khmer_name VARCHAR(150),
    english_name VARCHAR(150) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    class_name VARCHAR(50),
    grade VARCHAR(50),
    academic_year VARCHAR(50),
    parent_contact VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, GRADUATED, SUSPENDED, WITHDRAWN
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_students_code ON students(student_code);

