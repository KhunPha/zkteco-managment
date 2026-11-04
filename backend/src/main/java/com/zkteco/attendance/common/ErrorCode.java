package com.zkteco.attendance.common;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    INTERNAL_SERVER_ERROR("INTERNAL_ERROR", "Internal server error occurred", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_CREDENTIALS("AUTH_INVALID_CREDENTIALS", "Invalid username or password", HttpStatus.UNAUTHORIZED),
    TOKEN_EXPIRED("AUTH_TOKEN_EXPIRED", "Token has expired", HttpStatus.UNAUTHORIZED),
    TOKEN_INVALID("AUTH_TOKEN_INVALID", "Invalid or malformed token", HttpStatus.UNAUTHORIZED),
    ACCESS_DENIED("ACCESS_DENIED", "Access is denied for this resource", HttpStatus.FORBIDDEN),
    RESOURCE_NOT_FOUND("RESOURCE_NOT_FOUND", "Requested resource was not found", HttpStatus.NOT_FOUND),
    BAD_REQUEST("BAD_REQUEST", "Bad request or validation error", HttpStatus.BAD_REQUEST),
    DUPLICATE_RESOURCE("DUPLICATE_RESOURCE", "A resource with this identifier already exists", HttpStatus.CONFLICT),
    DEVICE_COMMUNICATION_ERROR("DEVICE_COMM_ERROR", "Failed to communicate with biometric terminal", HttpStatus.BAD_GATEWAY),
    DEVICE_OFFLINE("DEVICE_OFFLINE", "Device is currently offline or unreachable", HttpStatus.SERVICE_UNAVAILABLE),
    ATTENDANCE_PROCESSING_ERROR("ATTENDANCE_PROCESSING_ERROR", "Error calculating attendance record", HttpStatus.UNPROCESSABLE_ENTITY);

    private final String code;
    private final String defaultMessage;
    private final HttpStatus httpStatus;

    ErrorCode(String code, String defaultMessage, HttpStatus httpStatus) {
        this.code = code;
        this.defaultMessage = defaultMessage;
        this.httpStatus = httpStatus;
    }
}

