# ZKTeco Device Compatibility Matrix

## 1. Verified & Supported Device Families

| Device Model Series | Communication Type | Biometric Types Supported | Protocol Version |
|---------------------|--------------------|---------------------------|------------------|
| **ZKTeco K-Series** (K40, K20, K50) | TCP/IP (4370) & ADMS | Fingerprint, RFID Card, PIN | Standalone SDK / ADMS v2.4+ |
| **ZKTeco MB-Series** (MB20, MB160, MB360) | TCP/IP & ADMS | Face, Fingerprint, RFID | Standalone SDK / Push v2.4+ |
| **ZKTeco SpeedFace-V5L / Pro** | ADMS Push & Standalone TCP | Visible Light Facial Recognition, Palm, RFID | ADMS v3.0+ / Cloud Server |
| **ZKTeco FaceDepot-7B** | ADMS Push | Visible Light Face, RFID, PIN | ADMS v3.0+ |
| **ZKTeco iClock Series** (iClock 680, 880) | TCP/IP & ADMS | Fingerprint, Camera, RFID | Push Protocol / Standalone |
| **ZKTeco IN01-A / U300** | TCP/IP (4370) | Fingerprint, Card | Standalone binary socket |
| **Hardware Simulator** | TCP/IP & ADMS | All simulated modes | Full emulation |

## 2. Firmware Compatibility Guidelines

1. **ADMS Protocol Availability**: Ensure the terminal firmware includes the ADMS or Cloud Server module (typically standard in models manufactured after 2018 or enabled with ADMS firmware licenses).
2. **Push Port Default**: While standalone TCP uses port 4370, ADMS push communicates over standard HTTP port 80 (or 8080/443).
3. **Biometric Template Synchronization**: Due to proprietary encryption vectors across different algorithm versions (e.g. ZKFinger 10.0 vs 9.0, ZKFace 7.0 vs Visible Light Face), biometric templates should be registered locally on terminals, with attendance logs centralized automatically in our PostgreSQL database.

