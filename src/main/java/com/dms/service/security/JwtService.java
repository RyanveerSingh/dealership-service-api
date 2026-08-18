package com.dms.service.security;

import com.dms.service.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

/** Issues and verifies HS256 access tokens. */
@Service
public class JwtService {

    private static final String CLAIM_ROLE = "role";

    private final SecretKey key;
    private final Duration ttl;

    public JwtService(JwtProperties properties) {
        // Decoded, not raw: the yml value is base64. hmacShaKeyFor rejects
        // anything under 256 bits, so a too-short secret fails at startup.
        this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(properties.secret()));
        this.ttl = Duration.ofMinutes(properties.accessTokenMinutes());
    }

    public String issueToken(String email, String role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(email)
                .claim(CLAIM_ROLE, role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                .signWith(key)
                .compact();
    }

    /**
     * Verifies signature and expiry, returning the claims.
     * Empty when the token is absent, tampered with, or expired — the filter
     * treats all three the same way, as "not authenticated".
     */
    public Optional<Claims> parse(String token) {
        try {
            return Optional.of(Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload());
        } catch (JwtException | IllegalArgumentException ex) {
            return Optional.empty();
        }
    }

    public long ttlSeconds() {
        return ttl.toSeconds();
    }
}
