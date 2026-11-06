package com.zkteco.attendance.modules.upload;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.common.AppException;
import com.zkteco.attendance.common.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/uploads")
@Tag(name = "File Uploads", description = "Endpoints for uploading images and profile avatars")
public class FileUploadController {

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/svg+xml"
    );

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload image (drag and drop avatar)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadImage(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "File is required and cannot be empty");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new AppException(ErrorCode.BAD_REQUEST, "File size exceeds maximum allowed 10MB limit");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Invalid file format. Only JPEG, PNG, WEBP, GIF, and SVG are supported");
        }

        String originalFilename = file.getOriginalFilename();
        String extension = ".jpg";
        if (originalFilename != null && originalFilename.contains(".")) {
            String ext = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
            if (ext.matches("^\\.[a-z0-9]{2,5}$")) {
                extension = ext;
            }
        }

        String uniqueFileName = "avatar_" + UUID.randomUUID().toString().replace("-", "") + extension;
        Path targetDir = Paths.get("uploads", "avatars").toAbsolutePath().normalize();

        try {
            File dir = targetDir.toFile();
            if (!dir.exists()) {
                dir.mkdirs();
            }

            Path targetPath = targetDir.resolve(uniqueFileName);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            String publicUrl = "/uploads/avatars/" + uniqueFileName;
            log.info("Uploaded avatar saved to: {}", targetPath);

            return ResponseEntity.ok(ApiResponse.ok("Image uploaded successfully", Map.of(
                    "url", publicUrl,
                    "filename", uniqueFileName,
                    "size", file.getSize(),
                    "contentType", contentType
            )));
        } catch (IOException ex) {
            log.error("Failed to store uploaded image: {}", ex.getMessage(), ex);
            throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to store uploaded file on server");
        }
    }
}
