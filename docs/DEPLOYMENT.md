# Production Deployment Guide: Enterprise ZKTeco Biometric Attendance Platform

This guide provides step-by-step instructions for deploying the system into high-reliability production environments using **Docker Compose** or **Ubuntu Linux (bare-metal/VPS)**.

---

## 1. Production Hardware & Network Specifications

### Recommended Hardware
| Component | Minimum Specification | Recommended (5,000+ Personnel) |
|---|---|---|
| **CPU** | 4 Cores (x86_64 or ARM64) | 8 Cores (3.0 GHz+) |
| **RAM** | 8 GB | 16 GB - 32 GB |
| **Storage** | 50 GB SSD / NVMe | 200 GB+ Enterprise NVMe (RAID 10) |
| **Operating System** | Ubuntu 22.04 / 24.04 LTS | Ubuntu 24.04 LTS Enterprise |

### Network Topology & Port Allocation
To safeguard biometric devices and prevent unauthorized network snooping, place ZKTeco biometric terminals in a dedicated VLAN or segmented local subnet.

```
       [ Public Internet / Campus LAN ]
                     |
            +--------v--------+
            |  Nginx Ingress  | (Ports 80 / 443)
            +--------+--------+
                     |
       +-------------+-------------+
       |                           |
       v                           v
 [Next.js Web UI]         [Spring Boot Backend]
   (Port 3000)                (Port 8080)
                                   |
                         +---------+---------+
                         |                   |
                         v                   v
                  [PostgreSQL 16]        [Redis 7]
                    (Port 5432)         (Port 6379)
                         |
  [Dedicated Biometric Terminal VLAN (e.g., 192.168.100.0/24)]
                         |
  +----------------------+----------------------+
  |                                             |
  v                                             v
[TCP Pull Port 4370]                   [ADMS Push Port 8080/iclock]
(ZKTeco Standalone)                    (ZKTeco ADMS/Cloud Firmware)
```

| Port | Protocol | Scope | Purpose |
|---|---|---|---|
| **80 / 443** | HTTP / HTTPS | Public / LAN | Web UI, REST API, SSL Termination |
| **8080** | HTTP | Device VLAN / Ingress | ZKTeco ADMS Push Endpoint (`/iclock/*`) |
| **4370** | TCP | Device VLAN | Direct socket communication with terminals |
| **3000** | HTTP | Internal Docker | Next.js App Router server |
| **5432** | TCP | Internal Docker | PostgreSQL database |
| **6379** | TCP | Internal Docker | Redis caching and rate-limiting |

---

## 2. Fast-Track Deployment with Docker Compose

### Step 1: Clone Repository & Prepare Environment File
```bash
git clone https://github.com/organization/zkteco-attendance-platform.git
cd zkteco-attendance-platform

# Copy example environment configuration
cp .env.example .env
```

### Step 2: Configure Environment Variables
Edit `.env` and set strong production secrets:
```ini
# Database
POSTGRES_DB=zkteco_attendance
POSTGRES_USER=zkteco_admin
POSTGRES_PASSWORD=UseAStrongGeneratedPasswordHere!99$

# Spring Boot
SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8080

# Security (64-byte Hex or Base64 secret for HS512)
JWT_SECRET=c8f8b0e7a2b9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1
JWT_ACCESS_TOKEN_EXPIRATION_MS=86400000
JWT_REFRESH_TOKEN_EXPIRATION_MS=604800000

# School MIS Integration Key
MIS_API_KEY=mis_sec_prod_99f8a8b7c6d5e4f3

# Timezone
TZ=Asia/Phnom_Penh
```

### Step 3: Launch Containers
```bash
docker compose up -d --build
```

### Step 4: Verify Deployment Status
```bash
# Check all containers are healthy
docker compose ps

# Tail logs of backend
docker compose logs -f backend

# Verify database migrations executed cleanly
docker compose exec postgres psql -U zkteco_admin -d zkteco_attendance -c "SELECT version, description, success FROM flyway_schema_history;"
```

---

## 3. Production Nginx Configuration with SSL

A hardened Nginx configuration is located at `docker/nginx/nginx.conf`. To enable Let's Encrypt SSL:

```nginx
server {
    listen 80;
    server_name attendance.yourorganization.edu.kh;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name attendance.yourorganization.edu.kh;

    ssl_certificate /etc/letsencrypt/live/attendance.yourorganization.edu.kh/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/attendance.yourorganization.edu.kh/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend Next.js Application
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Spring Boot REST API
    location /api/ {
        proxy_pass http://backend:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ZKTeco ADMS Push Protocol (Raw HTTP, buffering disabled)
    location /iclock/ {
        proxy_pass http://backend:8080/iclock/;
        proxy_buffering off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 4. Bare-Metal / Ubuntu Linux Deployment (Systemd)

If running directly on Ubuntu 24.04 without Docker:

### 4.1. Install Prerequisites
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y openjdk-21-jdk nodejs npm postgresql redis-server nginx git
sudo npm install -g pnpm pm2
```

### 4.2. Build Applications
```bash
# Backend build
cd backend
mvn clean package -DskipTests
sudo mkdir -p /opt/zkteco-backend
sudo cp target/zkteco-attendance-system-1.0.0.jar /opt/zkteco-backend/app.jar

# Frontend build
cd ../frontend
npm install
npm run build
sudo mkdir -p /opt/zkteco-frontend
sudo cp -r . /opt/zkteco-frontend
```

### 4.3. Systemd Backend Service
Create `/etc/systemd/system/zkteco-backend.service`:
```ini
[Unit]
Description=ZKTeco Attendance Management Backend
After=network.target postgresql.service redis.service

[Service]
User=www-data
WorkingDirectory=/opt/zkteco-backend
ExecStart=/usr/bin/java -Xms1024m -Xmx4096m -jar /opt/zkteco-backend/app.jar --spring.profiles.active=prod
SuccessExitStatus=143
Restart=always
RestartSec=10
EnvironmentFile=/opt/zkteco-backend/.env

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now zkteco-backend
```

### 4.4. PM2 Frontend Service
```bash
cd /opt/zkteco-frontend
pm2 start npm --name "zkteco-frontend" -- start
pm2 save
pm2 startup
```

---

## 5. Automated Database Backups

The project includes production-tested backup and restore scripts in `/scripts`:

### Enable Daily Cron Backup
```bash
sudo chmod +x scripts/backup_db.sh scripts/restore_db.sh
crontab -e
```
Add the following line to schedule daily backups at 01:00 AM UTC:
```cron
0 1 * * * /opt/zkteco-attendance-platform/scripts/backup_db.sh /var/backups/zkteco >> /var/log/zkteco_backup.log 2>&1
```

### Restore Database from Backup
```bash
./scripts/restore_db.sh /var/backups/zkteco/zkteco_backup_20261104_010000.sql.gz
```

---

## 6. Health Checks & Telemetry

- **Application Health**: `GET http://<backend>:8080/actuator/health`
- **Prometheus Metrics**: `GET http://<backend>:8080/actuator/prometheus`
- **Default Super Admin Login**:
  - Username: `admin`
  - Password: `Admin@123456`
  > [!IMPORTANT]
  > Always change the default `admin` password immediately upon initial deployment via the User Management interface.

