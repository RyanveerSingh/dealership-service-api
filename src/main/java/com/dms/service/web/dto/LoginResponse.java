package com.dms.service.web.dto;

/**
 * Note what is absent: the password hash, and any field the caller did not need.
 * DTOs exist so entity changes never silently alter the wire contract.
 */
public record LoginResponse(
        String accessToken,
        String tokenType,
        long expiresInSeconds,
        String email,
        String fullName,
        String role
) {
}
