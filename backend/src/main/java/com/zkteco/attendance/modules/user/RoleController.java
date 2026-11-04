package com.zkteco.attendance.modules.user;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.modules.user.dto.RoleDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
@Tag(name = "Role Management", description = "Roles and permissions directory")
public class RoleController {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('role.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get all available system roles")
    public ResponseEntity<ApiResponse<List<RoleDto>>> getRoles() {
        List<RoleDto> roles = roleRepository.findAll().stream().map(r -> RoleDto.builder()
                .id(r.getId())
                .name(r.getName())
                .description(r.getDescription())
                .system(r.isSystem())
                .permissions(r.getPermissions() != null
                        ? r.getPermissions().stream().map(Permission::getCode).collect(Collectors.toSet())
                        : null)
                .build()
        ).collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok(roles));
    }

    @GetMapping("/permissions")
    @PreAuthorize("hasAuthority('role.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get all system permissions")
    public ResponseEntity<ApiResponse<List<Permission>>> getPermissions() {
        return ResponseEntity.ok(ApiResponse.ok(permissionRepository.findAll()));
    }
}

