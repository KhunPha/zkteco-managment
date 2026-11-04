package com.zkteco.attendance.modules.auth;

import com.zkteco.attendance.common.AppException;
import com.zkteco.attendance.modules.auth.dto.AuthResponse;
import com.zkteco.attendance.modules.auth.dto.LoginRequest;
import com.zkteco.attendance.modules.user.Role;
import com.zkteco.attendance.modules.user.User;
import com.zkteco.attendance.modules.user.UserMapper;
import com.zkteco.attendance.modules.user.UserRepository;
import com.zkteco.attendance.modules.user.dto.UserDto;
import com.zkteco.attendance.security.JwtTokenProvider;
import com.zkteco.attendance.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private JwtTokenProvider tokenProvider;
    @Mock
    private UserRepository userRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private AuthService authService;

    private User testUser;
    private Role superAdminRole;

    @BeforeEach
    void setUp() {
        superAdminRole = Role.builder().id(1L).name("SUPER_ADMIN").build();

        testUser = User.builder()
                .id(1L)
                .username("admin")
                .email("admin@enterprise.edu.kh")
                .passwordHash("hashed_password")
                .active(true)
                .locked(false)
                .failedLoginAttempts(0)
                .roles(Set.of(superAdminRole))
                .build();
    }

    @Test
    void testLogin_Success() {
        LoginRequest request = new LoginRequest();
        request.setUsername("admin");
        request.setPassword("Admin@123456");

        when(userRepository.findByUsernameAndDeletedAtIsNull("admin")).thenReturn(Optional.of(testUser));

        UserPrincipal principal = UserPrincipal.create(testUser);
        Authentication auth = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        when(authenticationManager.authenticate(any())).thenReturn(auth);
        when(tokenProvider.generateAccessToken(any())).thenReturn("mock.jwt.token");
        when(tokenProvider.generateRefreshTokenRaw()).thenReturn("raw-refresh-uuid");
        when(tokenProvider.hashToken("raw-refresh-uuid")).thenReturn("hashed-refresh-uuid");
        when(tokenProvider.getRefreshTokenExpirationMs()).thenReturn(604800000L);

        UserDto userDto = UserDto.builder().id(1L).username("admin").build();
        when(userMapper.toDto(any())).thenReturn(userDto);

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("mock.jwt.token", response.getAccessToken());
        assertEquals("raw-refresh-uuid", response.getRefreshToken());
        assertEquals(0, testUser.getFailedLoginAttempts());
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void testLogin_AccountDisabled_ThrowsAppException() {
        testUser.setActive(false);
        LoginRequest request = new LoginRequest();
        request.setUsername("admin");
        request.setPassword("Admin@123456");

        when(userRepository.findByUsernameAndDeletedAtIsNull("admin")).thenReturn(Optional.of(testUser));

        assertThrows(AppException.class, () -> authService.login(request));
        verify(authenticationManager, never()).authenticate(any());
    }

    @Test
    void testLogin_BadCredentials_IncrementsFailedAttempts() {
        LoginRequest request = new LoginRequest();
        request.setUsername("admin");
        request.setPassword("WrongPassword");

        when(userRepository.findByUsernameAndDeletedAtIsNull("admin")).thenReturn(Optional.of(testUser));
        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("Bad credentials"));

        assertThrows(AppException.class, () -> authService.login(request));
        assertEquals(1, testUser.getFailedLoginAttempts());
        verify(userRepository).save(testUser);
    }
}

