package com.dms.service.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * A staff login. Not to be confused with {@link Customer}, who is a person the
 * dealership services and has no credentials.
 *
 * Note the deliberate absence of Lombok's @Data: it would generate equals/hashCode
 * over every field, which breaks badly for JPA entities whose fields mutate after
 * persist and whose lazy proxies would be forced to initialise.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", nullable = false, length = 160, unique = true)
    private String email;

    /** BCrypt hash. Never expose this on a DTO. */
    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private Role role;

    /**
     * @Builder.Default is load-bearing: without it Lombok drops the initialiser
     * and every builder-created user would be inactive, so login would fail.
     */
    @Builder.Default
    @Column(name = "active", nullable = false)
    private boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;
}
