package com.zkteco.attendance.modules.biometric;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zkteco.attendance.common.AppException;
import com.zkteco.attendance.common.ErrorCode;
import com.zkteco.attendance.common.TimeUtils;
import com.zkteco.attendance.modules.attendance.AttendanceCalculationEngine;
import com.zkteco.attendance.modules.attendance.AttendanceRawLog;
import com.zkteco.attendance.modules.attendance.AttendanceRawLogRepository;
import com.zkteco.attendance.modules.biometric.dto.FaceDescriptorDto;
import com.zkteco.attendance.modules.biometric.dto.FaceEnrollmentRequest;
import com.zkteco.attendance.modules.biometric.dto.FacePunchRequest;
import com.zkteco.attendance.modules.biometric.dto.FacePunchResponse;
import com.zkteco.attendance.modules.device.AttendanceDeviceUser;
import com.zkteco.attendance.modules.device.DeviceUserRepository;
import com.zkteco.attendance.modules.personnel.Employee;
import com.zkteco.attendance.modules.personnel.EmployeeRepository;
import com.zkteco.attendance.modules.personnel.Student;
import com.zkteco.attendance.modules.personnel.StudentRepository;
import com.zkteco.attendance.modules.system.TelegramNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FaceBiometricService {

    private final FaceBiometricRepository faceRepository;
    private final FaceScanLogRepository scanLogRepository;
    private final AttendanceRawLogRepository rawLogRepository;
    private final AttendanceCalculationEngine calculationEngine;
    private final EmployeeRepository employeeRepository;
    private final StudentRepository studentRepository;
    private final DeviceUserRepository deviceUserRepository;
    private final TelegramNotificationService telegramService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public FaceDescriptorDto enrollFace(FaceEnrollmentRequest request) {
        String pin = request.getDevicePin().trim();

        // 1. Process base64 photo
        String photoUrl = saveBase64Image(request.getPhotoBase64(), "enrolled", pin);

        // 2. Process descriptor JSON (with strict L2 normalization)
        String descriptorJson = request.getDescriptorJson();
        List<Float> descriptorList = request.getDescriptor();
        if (descriptorJson == null || descriptorJson.isBlank()) {
            if (descriptorList != null && !descriptorList.isEmpty()) {
                try {
                    descriptorList = normalize(descriptorList);
                    descriptorJson = objectMapper.writeValueAsString(descriptorList);
                } catch (Exception e) {
                    throw new AppException(ErrorCode.BAD_REQUEST, "Failed to serialize face descriptor: " + e.getMessage());
                }
            } else {
                throw new AppException(ErrorCode.BAD_REQUEST, "Face descriptor vector (128 floats) is required");
            }
        } else if (descriptorList == null || descriptorList.isEmpty()) {
            try {
                descriptorList = objectMapper.readValue(descriptorJson, new TypeReference<List<Float>>() {});
                if (descriptorList != null) {
                    descriptorList = normalize(descriptorList);
                    descriptorJson = objectMapper.writeValueAsString(descriptorList);
                }
            } catch (Exception ignored) {}
        } else {
            descriptorList = normalize(descriptorList);
            try {
                descriptorJson = objectMapper.writeValueAsString(descriptorList);
            } catch (Exception ignored) {}
        }

        // 2.5. Anti-Duplicate Face Protection: Reject duplicate faces across different users
        if (descriptorList != null && !descriptorList.isEmpty()) {
            List<FaceBiometric> allEnrolled = faceRepository.findAll();
            for (FaceBiometric existing : allEnrolled) {
                // If it belongs to a different person / PIN
                if (!existing.getDevicePin().equalsIgnoreCase(pin) && existing.getDescriptorJson() != null) {
                    try {
                        List<Float> otherDesc = objectMapper.readValue(existing.getDescriptorJson(), new TypeReference<List<Float>>() {});
                        if (otherDesc != null && otherDesc.size() == descriptorList.size()) {
                            double dist = calculateDistance(descriptorList, otherDesc);
                            if (dist < 0.35) {
                                String otherName = existing.getPersonName() != null ? existing.getPersonName() : "User " + existing.getDevicePin();
                                throw new AppException(ErrorCode.BAD_REQUEST, String.format(
                                        "Duplicate face detected! This face is already enrolled to '%s' (PIN %s). A person cannot be enrolled under multiple user accounts.",
                                        otherName, existing.getDevicePin()
                                ));
                            }
                        }
                    } catch (AppException ae) {
                        throw ae;
                    } catch (Exception ex) {
                        log.warn("Failed to check duplicate face against PIN {}: {}", existing.getDevicePin(), ex.getMessage());
                    }
                }
            }
        }

        // 3. Resolve Personnel
        Employee employee = null;
        Student student = null;
        String personnelType = request.getPersonnelType() != null ? request.getPersonnelType().toUpperCase() : "EMPLOYEE";
        String resolvedName = request.getPersonName();

        if (request.getEmployeeId() != null) {
            employee = employeeRepository.findById(request.getEmployeeId()).orElse(null);
        }
        if (request.getStudentId() != null) {
            student = studentRepository.findById(request.getStudentId()).orElse(null);
        }

        // Lookup by pin/code if not explicitly linked
        if (employee == null && student == null) {
            Optional<Employee> empOpt = employeeRepository.findByEmployeeCodeAndDeletedAtIsNull(pin);
            if (empOpt.isEmpty()) {
                empOpt = employeeRepository.findFirstByEmployeeCodeOrderByIdDesc(pin);
            }
            if (empOpt.isPresent()) {
                employee = empOpt.get();
                personnelType = isTeacher(employee) ? "TEACHER" : "EMPLOYEE";
            } else {
                Optional<Student> stuOpt = studentRepository.findByStudentCodeAndDeletedAtIsNull(pin);
                if (stuOpt.isEmpty()) {
                    stuOpt = studentRepository.findFirstByStudentCodeOrderByIdDesc(pin);
                }
                if (stuOpt.isPresent()) {
                    student = stuOpt.get();
                    personnelType = "STUDENT";
                }
            }
        }

        if (employee != null) {
            resolvedName = employee.getEnglishName();
            if (employee.getProfileImageUrl() == null || employee.getProfileImageUrl().isBlank()) {
                employee.setProfileImageUrl(photoUrl);
                employeeRepository.save(employee);
            }
            personnelType = isTeacher(employee) ? "TEACHER" : "EMPLOYEE";
        } else if (student != null) {
            resolvedName = student.getEnglishName();
            if (student.getProfileImageUrl() == null || student.getProfileImageUrl().isBlank()) {
                student.setProfileImageUrl(photoUrl);
                studentRepository.save(student);
            }
            personnelType = "STUDENT";
        }

        // 4. Save or Update FaceBiometric
        FaceBiometric face = faceRepository.findByDevicePin(pin)
                .orElseGet(() -> FaceBiometric.builder().devicePin(pin).build());

        face.setPersonnelType(personnelType);
        face.setEmployee(employee);
        face.setStudent(student);
        face.setPersonName(resolvedName);
        face.setPhotoPath(photoUrl);
        face.setDescriptorJson(descriptorJson);
        face.setQualityScore(1.0);
        FaceBiometric saved = faceRepository.save(face);

        // 5. Update face_enrolled on device users if mapped
        List<AttendanceDeviceUser> devUsers = deviceUserRepository.findByDevicePin(pin);
        for (AttendanceDeviceUser u : devUsers) {
            u.setFaceEnrolled(true);
            deviceUserRepository.save(u);
        }

        log.info("Webcam Face ID enrolled successfully for pin={}, name={}, type={}", pin, resolvedName, personnelType);

        return toDto(saved, descriptorList);
    }

    @Transactional(readOnly = true)
    public List<FaceDescriptorDto> getAllDescriptors() {
        List<FaceBiometric> list = faceRepository.findAllWithPersonnel();
        return list.stream().map(f -> {
            List<Float> desc = null;
            try {
                desc = objectMapper.readValue(f.getDescriptorJson(), new TypeReference<List<Float>>() {});
            } catch (Exception e) {
                log.warn("Failed to parse descriptor for pin {}", f.getDevicePin());
            }
            return toDto(f, desc);
        }).collect(Collectors.toList());
    }

    @Transactional
    public FacePunchResponse verifyAndPunch(FacePunchRequest request) {
        String pin = request.getDevicePin().trim();
        Instant now = Instant.now();
        String punchState = request.getPunchState() != null ? request.getPunchState().toUpperCase() : "CHECK_IN";

        // 1. Resolve Enrolled Person strictly (Reject any unenrolled attempt)
        FaceBiometric f = faceRepository.findByDevicePin(pin)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Face biometric is not enrolled for PIN / Code: " + pin + ". Access denied."));

        // 2. Strict Biometric Threshold Verification (0.35 maximum distance)
        if (request.getDistance() != null && request.getDistance() > 0.35) {
            throw new AppException(ErrorCode.BAD_REQUEST, String.format("Biometric match distance %.3f exceeds strict 0.35 threshold. Verification rejected.", request.getDistance()));
        }

        // 3. Double Server-Side Vector Verification if descriptor provided
        if (request.getDescriptor() != null && !request.getDescriptor().isEmpty() && f.getDescriptorJson() != null) {
            try {
                List<Float> enrolledDesc = objectMapper.readValue(f.getDescriptorJson(), new TypeReference<List<Float>>() {});
                if (enrolledDesc != null && enrolledDesc.size() == request.getDescriptor().size()) {
                    List<Float> normQuery = normalize(request.getDescriptor());
                    List<Float> normEnrolled = normalize(enrolledDesc);
                    double serverDist = calculateDistance(normQuery, normEnrolled);
                    log.info("Server-side biometric validation for PIN {}: serverDistance={}", pin, serverDist);
                    if (serverDist > 0.34) {
                        throw new AppException(ErrorCode.BAD_REQUEST, String.format("Biometric verification mismatch: distance %.3f exceeds strict 0.34 threshold", serverDist));
                    }
                }
            } catch (AppException ae) {
                throw ae;
            } catch (Exception ex) {
                log.warn("Server descriptor parsing warning for PIN {}: {}", pin, ex.getMessage());
            }
        }

        String personName = f.getPersonName() != null ? f.getPersonName() : "User " + pin;
        String khmerName = null;
        String code = pin;
        String personType = f.getPersonnelType() != null ? f.getPersonnelType() : "EMPLOYEE";
        String deptOrClass = "General Campus";
        String photoUrl = f.getPhotoPath();

        if (f.getEmployee() != null) {
            Employee emp = f.getEmployee();
            personName = emp.getEnglishName();
            khmerName = emp.getKhmerName();
            code = emp.getEmployeeCode();
            deptOrClass = emp.getDepartment() != null ? emp.getDepartment().getName() : "Office";
            personType = isTeacher(emp) ? "TEACHER" : "EMPLOYEE";
        } else if (f.getStudent() != null) {
            Student s = f.getStudent();
            personName = s.getEnglishName();
            khmerName = s.getKhmerName();
            code = s.getStudentCode();
            deptOrClass = (s.getClassName() != null ? s.getClassName() : "") + (s.getGrade() != null ? " (" + s.getGrade() + ")" : "");
            personType = "STUDENT";
        }

        // 2. Save snapshot frame to scans directory if provided
        String scanPhotoPath = null;
        if (request.getSnapshotBase64() != null && !request.getSnapshotBase64().isBlank()) {
            scanPhotoPath = saveBase64Image(request.getSnapshotBase64(), "scans", pin);
            try {
                FaceScanLog scanLog = FaceScanLog.builder()
                        .devicePin(pin)
                        .personName(personName)
                        .personnelType(personType)
                        .distance(request.getDistance())
                        .confidenceScore(request.getConfidence() != null ? request.getConfidence() : (request.getDistance() != null ? Math.max(0, 100 - request.getDistance() * 100) : 98.5))
                        .photoPath(scanPhotoPath)
                        .punchState(punchState)
                        .createdAt(now)
                        .build();
                scanLogRepository.save(scanLog);
            } catch (Exception e) {
                log.warn("Failed to persist face scan log: {}", e.getMessage());
            }
        }

        // 3. Create idempotency key (grouped within 3-second window)
        long bucket = now.getEpochSecond() / 3;
        String rawKey = "WEBCAM_" + pin + "_" + bucket + "_" + punchState;
        String idempotencyKey = hashKey(rawKey);

        Long logId = null;
        if (!rawLogRepository.existsByIdempotencyKey(idempotencyKey)) {
            AttendanceRawLog rawLog = AttendanceRawLog.builder()
                    .deviceSn("WEBCAM_GATE_01")
                    .devicePin(pin)
                    .punchTime(now)
                    .punchState(punchState)
                    .verifyType("FACE")
                    .originalPayload("WEBCAM_FACE_ID: pin=" + pin + ", distance=" + request.getDistance())
                    .idempotencyKey(idempotencyKey)
                    .processed(false)
                    .build();
            AttendanceRawLog saved = rawLogRepository.save(rawLog);
            rawLogRepository.flush();
            logId = saved.getId();

            // 4. Calculate Attendance for today
            try {
                LocalDate today = LocalDate.now(TimeUtils.PHNOM_PENH_ZONE);
                calculationEngine.processAttendanceForDate(today);
            } catch (Exception ex) {
                log.error("Failed to auto-calculate daily attendance for face punch: {}", ex.getMessage());
            }

            // 5. Send Real-Time Telegram Broadcast Alert
            try {
                String extra = "📍 " + deptOrClass + (request.getDistance() != null ? String.format(" | Face Match: %.1f%%", Math.max(0, (1.0 - request.getDistance()) * 100)) : "");
                String displayName = khmerName != null && !khmerName.isBlank() ? khmerName + " (" + personName + ")" : personName;
                telegramService.sendPunchNotification(
                        displayName,
                        code,
                        personType,
                        extra,
                        punchState,
                        now,
                        "Main Campus",
                        request.getDeviceName() != null ? request.getDeviceName() : "Webcam Face Gate #1"
                );
            } catch (Exception ex) {
                log.error("Failed to dispatch Telegram punch notification: {}", ex.getMessage());
            }
        } else {
            log.info("Duplicate face punch suppressed for pin={} within 3s debounce", pin);
        }

        return FacePunchResponse.builder()
                .rawLogId(logId)
                .devicePin(pin)
                .personnelCode(code)
                .personName(personName)
                .khmerName(khmerName)
                .personnelType(personType)
                .departmentOrClass(deptOrClass)
                .photoUrl(photoUrl != null ? photoUrl : scanPhotoPath)
                .punchTime(now)
                .punchState(punchState)
                .status("SUCCESS")
                .message("Face ID verified successfully")
                .build();
    }

    @Transactional
    public void deleteFace(String devicePin) {
        faceRepository.deleteByDevicePin(devicePin);
        List<AttendanceDeviceUser> devUsers = deviceUserRepository.findByDevicePin(devicePin);
        for (AttendanceDeviceUser u : devUsers) {
            u.setFaceEnrolled(false);
            deviceUserRepository.save(u);
        }
        log.info("Face biometric deleted for pin={}", devicePin);
    }

    private String saveBase64Image(String base64Data, String subfolder, String pin) {
        if (base64Data == null || base64Data.isBlank()) return "";

        String clean = base64Data;
        String extension = "jpg";
        if (clean.contains(",")) {
            String header = clean.substring(0, clean.indexOf(","));
            if (header.contains("png")) extension = "png";
            else if (header.contains("webp")) extension = "webp";
            clean = clean.substring(clean.indexOf(",") + 1);
        }

        byte[] bytes = Base64.getDecoder().decode(clean);
        String filename = pin + "_" + System.currentTimeMillis() + "." + extension;

        try {
            Path targetDir = Paths.get("uploads", "faces", subfolder).toAbsolutePath().normalize();
            if (!Files.exists(targetDir)) {
                Files.createDirectories(targetDir);
            }
            Path filePath = targetDir.resolve(filename);
            try (OutputStream os = new FileOutputStream(filePath.toFile())) {
                os.write(bytes);
            }
            return "/uploads/faces/" + subfolder + "/" + filename;
        } catch (Exception e) {
            log.error("Failed to save face image file: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to save face image: " + e.getMessage());
        }
    }

    private boolean isTeacher(Employee emp) {
        if (emp == null) return false;
        String pos = emp.getPosition() != null ? emp.getPosition().getTitle() : "";
        String dept = emp.getDepartment() != null ? emp.getDepartment().getName() : "";
        String combined = (pos + " " + dept).toLowerCase();
        return combined.contains("teacher") || combined.contains("teach") || combined.contains("lecturer") || combined.contains("professor") || (emp.getDepartment() != null && Long.valueOf(4L).equals(emp.getDepartment().getId()));
    }

    private FaceDescriptorDto toDto(FaceBiometric f, List<Float> descriptor) {
        String khmer = null;
        String code = f.getDevicePin();
        String deptOrClass = "Campus";

        if (f.getEmployee() != null) {
            Employee emp = f.getEmployee();
            khmer = emp.getKhmerName();
            code = emp.getEmployeeCode();
            deptOrClass = emp.getDepartment() != null ? emp.getDepartment().getName() : "Office";
        } else if (f.getStudent() != null) {
            Student s = f.getStudent();
            khmer = s.getKhmerName();
            code = s.getStudentCode();
            deptOrClass = (s.getClassName() != null ? s.getClassName() : "") + (s.getGrade() != null ? " (" + s.getGrade() + ")" : "");
        }

        return FaceDescriptorDto.builder()
                .id(f.getId())
                .devicePin(f.getDevicePin())
                .personnelType(f.getPersonnelType())
                .employeeId(f.getEmployee() != null ? f.getEmployee().getId() : null)
                .studentId(f.getStudent() != null ? f.getStudent().getId() : null)
                .personName(f.getPersonName())
                .khmerName(khmer)
                .personnelCode(code)
                .departmentOrClass(deptOrClass)
                .photoUrl(f.getPhotoPath())
                .descriptor(descriptor)
                .qualityScore(f.getQualityScore())
                .build();
    }

    private double calculateDistance(List<Float> a, List<Float> b) {
        if (a == null || b == null || a.size() != b.size() || a.isEmpty()) return 1.0;
        List<Float> normA = normalize(a);
        List<Float> normB = normalize(b);
        double sum = 0.0;
        for (int i = 0; i < normA.size(); i++) {
            double diff = normA.get(i) - normB.get(i);
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }

    private List<Float> normalize(List<Float> vec) {
        if (vec == null || vec.isEmpty()) return vec;
        double sum = 0.0;
        for (Float val : vec) {
            if (val != null) sum += val * val;
        }
        double norm = Math.sqrt(sum);
        if (norm == 0.0 || Math.abs(norm - 1.0) < 1e-5) return vec;
        List<Float> result = new ArrayList<>(vec.size());
        for (Float val : vec) {
            result.add((float) ((val != null ? val : 0.0) / norm));
        }
        return result;
    }

    private String hashKey(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return UUID.randomUUID().toString().replace("-", "");
        }
    }
}
