package com.dms.service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds the app.jwt.* block in application.yml.
 *
 * Typed config rather than @Value string literals: a missing or malformed value
 * fails at startup instead of at the first login attempt.
 */
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(String secret, long accessTokenMinutes) {
}
