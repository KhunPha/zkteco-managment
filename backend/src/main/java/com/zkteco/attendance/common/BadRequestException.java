package com.zkteco.attendance.common;

public class BadRequestException extends AppException {
    public BadRequestException(String message) {
        super(ErrorCode.BAD_REQUEST, message);
    }
}

