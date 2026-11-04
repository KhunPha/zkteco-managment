package com.zkteco.attendance.modules.user;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.common.PageResponse;
import com.zkteco.attendance.modules.user.dto.CreateUserRequest;
import com.zkteco.attendance.modules.user.dto.UpdateUserRequest;
import com.zkteco.attendance.modules.user.dto.UserDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "User Management", description = "System user accounts and access administration")
public class UserController {

    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasAuthority('user.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get paginated users list with search")
    public ResponseEntity<ApiResponse<PageResponse<UserDto>>> getUsers(
            @RequestParam(required = false) String search,
            @PageableDefault(size = 15, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getUsers(search, pageable)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('user.read') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Get user details by ID")
    public ResponseEntity<ApiResponse<UserDto>> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getUserById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('user.create') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Create a new user account")
    public ResponseEntity<ApiResponse<UserDto>> createUser(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("User created successfully", userService.createUser(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('user.update') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Update an existing user account")
    public ResponseEntity<ApiResponse<UserDto>> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("User updated successfully", userService.updateUser(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('user.delete') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Soft delete a user account")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.ok("User deleted successfully", null));
    }
}

