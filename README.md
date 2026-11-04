# Enterprise ZKTeco Biometric Attendance Management System

[![Java 21](https://img.shields.io/badge/Java-21%20LTS-orange.svg)](https://openjdk.org/projects/jdk/21/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.3-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Next.js](https://img.shields.io/badge/Next.js-15.0%20(JSX)-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Enterprise-red.svg)]()

A centralized, production-grade biometric attendance and workforce management platform designed to connect directly with **ZKTeco fingerprint, facial recognition, and RFID terminals**. 

The system operates autonomously—eliminating reliance on proprietary ZKTeco desktop software for core attendance tracking, employee synchronization, rule evaluation, and payroll reporting.

---

## 1. Key Capabilities

- **Dual-Engine ZKTeco Protocol Support**:
  - **TCP/IP Binary Socket Protocol** on port `4370` for direct network polling, time synchronization, user push/pull, and remote terminal commands.
  - **ADMS / PUSH HTTP Server** handling `/iclock/cdata`, `/iclock/getrequest`, and `/iclock/devicecmd` for cloud-managed WAN terminals behind NAT.
- **Enterprise Attendance Rules Engine**:
  - Flexible shift configuration (morning, afternoon, split, and cross-midnight night shifts).
  - Configurable grace late arrival, early departure tolerance, break deductions, and overtime thresholds.
  - Multi-status evaluation (`PRESENT`, `LATE`, `EARLY_DEPARTURE`, `HALF_DAY`, `ABSENT`, `ON_LEAVE`, `HOLIDAY`).
  - Audited attendance correction workflow with immutable raw punch retention.
- **Workforce & Organization Hierarchy**:
  - Multi-campus branches, departments, and position designations.
  - Complete employee profiles with bilingual name support (Khmer & English).
  - Integrated student attendance tracking module for educational institutions.
  - PIN-to-person mapping allowing multiple terminals per employee.
- **Statutory Leave & Holiday Management**:
  - Custom leave types (Annual, Sick, Maternity, Special).
  - Accrual balance tracking, multi-tier approval chains, and recurring public holiday calendars.
- **High-Performance Reporting & Data Exports**:
  - Daily roll-call summaries, monthly work hour sheets, and individual employee logs.
  - Real-time file generation for **Microsoft Excel (.xlsx)**, **Comma-Separated Values (.csv)**, and **Adobe PDF (.pdf)** with Khmer/UTF-8 support.
- **Zero-Hardware Simulation Environment**:
  - High-fidelity Node.js simulator (`simulator/zkteco_device_simulator.js`) simulating TCP socket connections and ADMS HTTP push requests with an interactive CLI.
- **School MIS Integration**:
  - Secure API key authorization, roster synchronizers, and outbound attendance push webhooks.

---

## 2. System Architecture

```
                               +-----------------------------+
                               |   ZKTeco Biometric Terminal |
                               |   (Finger / Face / Card)    |
                               +--------------+--------------+
                                              |
                        +---------------------+---------------------+
                        |                                           |
            [TCP Socket Port 4370]                        [ADMS HTTP Push]
            Binary Packet Protocol                        /iclock/cdata & /iclock/getrequest
                        |                                           |
                        v                                           v
                +---------------+                           +---------------+
                |ZKTecoTcpClient|                           | ZKTecoPushSvc |
                +-------+-------+                           +-------+-------+
                        |                                           |
                        +---------------------+---------------------+
                                              |
                                              v
                                +---------------------------+
                                | attendance_raw_logs Table | (Immutable Events)
                                +-------------+-------------+
                                              |
                                              v
                                +---------------------------+
                                | AttendanceCalculationEng  |
                                |  - Shift boundary matching|
                                |  - Grace late calculation |
                                |  - Overtime & night shifts|
                                +-------------+-------------+
                                              |
                                              v
                                +---------------------------+
                                | attendance_records Table  | (Processed Daily)
                                +-------------+-------------+
                                              |
                        +---------------------+---------------------+
                        |                                           |
                        v                                           v
          +---------------------------+               +---------------------------+
          | Next.js App Router (JSX)  |               |  School MIS & Webhooks    |
          | Responsive Web Dashboard  |               |  API Key Protected Sync   |
          +---------------------------+               +---------------------------+
```

---

## 3. Technology Stack

### Backend
- **Runtime**: Java 21 LTS
- **Framework**: Spring Boot 3.4.3
- **Security**: Spring Security 6 with JWT (HS512) and SHA-256 hashed rotating refresh tokens
- **Persistence**: Spring Data JPA / Hibernate with PostgreSQL 16
- **Database Migrations**: Flyway (`V1` through `V6` with seed data)
- **Reporting Engine**: Apache POI 5.3.0 (Excel), OpenPDF 2.0.3 (PDF), Commons CSV 1.12.0
- **Caching**: Spring Cache with Redis 7
- **API Documentation**: SpringDoc OpenAPI / Swagger UI

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: JavaScript JSX (**Strictly pure JSX, zero TypeScript**)
- **Styling**: Tailwind CSS v4, PostCSS
- **Component Primitives**: Radix UI, Lucide React
- **State Management**: TanStack Query (React Query v5) & Zustand
- **Forms & Validation**: React Hook Form with Zod schemas
- **Visualization**: Recharts interactive time-series & attendance charts
- **Localization**: English and Khmer UI translation toggles

---

## 4. Default Credentials & Initial Setup

Upon the first launch, the Flyway migration (`V6__seed_data.sql`) seeds the initial Super Administrator account:

| Attribute | Default Production Value |
|---|---|
| **Portal URL** | `http://localhost:3000` (or `http://localhost:80`) |
| **Backend REST API** | `http://localhost:8080/api/v1` |
| **Swagger UI** | `http://localhost:8080/swagger-ui.html` |
| **Username** | `admin` |
| **Password** | `Admin@123456` |
| **Default Timezone** | `Asia/Phnom_Penh` (UTC+07:00) |

> [!IMPORTANT]
> Change the default administrator password immediately after first sign-in via the **Settings -> User Management** menu.

---

## 5. Quick Start: Local Development

### Prerequisites
- JDK 21 LTS installed and on `PATH`
- Node.js 20+ and npm installed
- Docker and Docker Compose (or local PostgreSQL 16 and Redis 7 instances)

### Step 1: Start Supporting Infrastructure
```bash
# Start PostgreSQL and Redis containers
docker compose up -d postgres redis
```

### Step 2: Start Spring Boot Backend
```bash
cd backend
mvn clean spring-boot:run
```
The backend initializes database tables via Flyway migrations and begins listening on port `8080`.

### Step 3: Start Next.js Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 6. Full Docker Compose Deployment

To deploy the entire production stack including Backend, Frontend, PostgreSQL, Redis, and Nginx reverse proxy:

```bash
# Clone the repository
git clone https://github.com/organization/zkteco-attendance-platform.git
cd zkteco-attendance-platform

# Create your production environment file
cp .env.example .env

# Build and start all services in detached mode
docker compose up -d --build

# Verify container health
docker compose ps
```

---

## 7. Hardware Simulator (Zero-Hardware Testing)

To test the system without physical biometric hardware, use the built-in ZKTeco Hardware Simulator:

```bash
cd simulator
npm install
node zkteco_device_simulator.js
```

### Simulator Commands:
- `handshake`: Sends a test ADMS `/iclock/cdata` handshake to register with the server.
- `punch <pin>`: Simulates a real-time biometric scan for employee PIN (e.g. `punch 1001`).
- `batch <count>`: Generates and uploads a batch of random biometric punches.
- `help`: Displays available interactive commands.

---

## 8. Technical Documentation Directory

Comprehensive architectural and operational guides are provided in the `/docs` directory:

| Document | Description |
|---|---|
| [System Architecture](file:///docs/ARCHITECTURE.md) | Modular monolith boundaries, layers, and data flow |
| [Database Schema](file:///docs/DATABASE.md) | Entity relationship models, constraints, and Flyway migrations |
| [REST API Specification](file:///docs/API.md) | OpenAPI directory, payload formats, and error codes |
| [ZKTeco Integration](file:///docs/ZKTECO-INTEGRATION.md) | TCP binary socket protocol and ADMS HTTP push specifications |
| [Device Compatibility Matrix](file:///docs/DEVICE-COMPATIBILITY.md) | Supported ZKTeco terminals, firmware versions, and capabilities |
| [Attendance Rules Engine](file:///docs/ATTENDANCE-RULES.md) | Formulas for shifts, late arrivals, overtime, and night shifts |
| [Security & Privacy](file:///docs/SECURITY.md) | Cryptography, biometric privacy, JWT rotation, and network VLANs |
| [Production Deployment](file:///docs/DEPLOYMENT.md) | Docker, Ubuntu Linux, Nginx SSL, and backup/restore procedures |
| [Troubleshooting Guide](file:///docs/TROUBLESHOOTING.md) | Diagnostic workflows, socket debugging, and recovery steps |

---

## 9. Verification & Automated Test Suite

Run backend unit and integration test suites:
```bash
cd backend
mvn test
```

Run frontend static build validation:
```bash
cd frontend
npm run build
```

---

## 10. License & Maintenance

This software is licensed under the Enterprise Commercial License. All rights reserved.
Developed for production deployment in enterprise and educational institutions.

