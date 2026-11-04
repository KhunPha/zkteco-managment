package com.zkteco.attendance.modules.auth;

import com.zkteco.attendance.common.AppException;
import com.zkteco.attendance.common.ErrorCode;
import com.zkteco.attendance.modules.auth.dto.AuthResponse;
import com.zkteco.attendance.modules.auth.dto.ChangePasswordRequest;
import com.zkteco.attendance.modules.auth.dto.LoginRequest;
import com.zkteco.attendance.modules.auth.dto.TokenRefreshRequest;
import com.zkteco.attendance.modules.user.User;
import com.zkteco.attendance.modules.user.UserMapper;
import com.zkteco.attendance.modules.user.UserRepository;
import com.zkteco.attendance.modules.user.dto.UserDto;
import com.zkteco.attendance.security.JwtTokenProvider;
import com.zkteco.attendance.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsernameAndDeletedAtIsNull(request.getUsername())
                .or(() -> userRepository.findByEmailAndDeletedAtIsNull(request.getUsername()))
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_CREDENTIALS));

        if (!user.isActive()) {
            throw new AppException(ErrorCode.ACCESS_DENIED, "Account is disabled. Contact your administrator.");
        }

        if (user.isLocked()) {
            throw new AppException(ErrorCode.ACCESS_DENIED, "Account is temporarily locked due to excessive failed attempts.");
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();

            // Reset failed login attempts and update last login time
            user.setFailedLoginAttempts(0);
            user.setLastLoginAt(Instant.now());
            userRepository.save(user);

            // Generate access token
            String accessToken = tokenProvider.generateAccessToken(userPrincipal);

            // Generate hashed refresh token
            String rawRefreshToken = tokenProvider.generateRefreshTokenRaw();
            String hashedRefreshToken = tokenProvider.hashToken(rawRefreshToken);

            RefreshToken refreshToken = RefreshToken.builder()
                    .user(user)
                    .tokenHash(hashedRefreshToken)
                    .expiresAt(Instant.now().plusMillis(tokenProvider.getRefreshTokenExpirationMs()))
                    .revoked(false)
                    .build();
            refreshTokenRepository.save(refreshToken);

            UserDto userDto = userMapper.toDto(user);

            return AuthResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(rawRefreshToken)
                    .tokenType("Bearer")
                    .expiresIn(86400) // 24 hours in seconds
                    .user(userDto)
                    .build();

        } catch (BadCredentialsException ex) {
            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);
            if (attempts >= 5) {
                user.setLocked(true);
                log.warn("User {} locked after 5 consecutive failed login attempts", user.getUsername());
            }
            userRepository.save(user);
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }
    }

    @Transactional
    public AuthResponse refreshToken(TokenRefreshRequest request) {
        String hashedToken = tokenProvider.hashToken(request.getRefreshToken());

        RefreshToken refreshToken = refreshTokenRepository.findByTokenHash(hashedToken)
                .orElseThrow(() -> new AppException(ErrorCode.TOKEN_INVALID, "Invalid refresh token"));

        if (refreshToken.isRevoked() || refreshToken.isExpired()) {
            throw new AppException(ErrorCode.TOKEN_EXPIRED, "Refresh token expired or revoked");
        }

        User user = refreshToken.getUser();
        if (!user.isActive() || user.isLocked()) {
            throw new AppException(ErrorCode.ACCESS_DENIED, "User account is disabled or locked");
        }

        UserPrincipal userPrincipal = UserPrincipal.create(user);
        String newAccessToken = tokenProvider.generateAccessToken(userPrincipal);

        // Rotate refresh token
        String newRawRefreshToken = tokenProvider.generateRefreshTokenRaw();
        String newHashedToken = tokenProvider.hashToken(newRawRefreshToken);

        refreshToken.setRevoked(true);
        refreshToken.setRevokedAt(Instant.now());
        refreshToken.setReplacedByToken(newHashedToken);
        refreshTokenRepository.save(refreshToken);

        RefreshToken newRefreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(newHashedToken)
                .expiresAt(Instant.now().plusMillis(tokenProvider.getRefreshTokenExpirationMs()))
                .revoked(false)
                .build();
        refreshTokenRepository.save(newRefreshToken);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRawRefreshToken)
                .tokenType("Bearer")
                .expiresIn(86400)
                .user(userMapper.toDto(user))
                .build();
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken != null && !rawRefreshToken.trim().isEmpty()) {
            String hashed = tokenProvider.hashToken(rawRefreshToken);
            refreshTokenRepository.findByTokenHash(hashed).ifPresent(token -> {
                token.setRevoked(true);
                token.setRevokedAt(Instant.now());
                refreshTokenRepository.save(token);
            });
        }
        SecurityContextHolder.clearContext();
    }

    @Transactional(readOnly = true)
    public UserDto getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new AppException(ErrorCode.ACCESS_DENIED, "Not authenticated");
        }

        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "User not found"));

        return userMapper.toDto(user);
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        UserDto currentUser = getCurrentUser();
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS, "Current password does not match");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}

