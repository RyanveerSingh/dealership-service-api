package com.dms.service.config;

import com.dms.service.security.JwtAuthenticationFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.time.Instant;
import java.util.Map;

@Configuration
@EnableMethodSecurity   // enables @PreAuthorize on service and controller methods
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final ObjectMapper objectMapper;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter, ObjectMapper objectMapper) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.objectMapper = objectMapper;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // No cookies are used, so there is no CSRF vector to defend. Leaving
            // CSRF on would break every non-GET call from a token client.
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                        "/api/auth/**",
                        "/actuator/health",
                        "/actuator/health/**",
                        "/v3/api-docs",
                        "/v3/api-docs/**",
                        "/swagger-ui/**",
                        "/swagger-ui.html").permitAll()
                // Coarse gate only. Fine-grained rules live on the methods via
                // @PreAuthorize, next to the logic they protect.
                .anyRequest().authenticated())
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((req, res, e) ->
                        writeError(res, HttpServletResponse.SC_UNAUTHORIZED,
                                   "Unauthorized", "Authentication required", req.getRequestURI()))
                .accessDeniedHandler((req, res, e) ->
                        writeError(res, HttpServletResponse.SC_FORBIDDEN,
                                   "Forbidden", "Insufficient role for this operation", req.getRequestURI())))
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Security's own 401/403 responses bypass @RestControllerAdvice because they
     * are produced by filters, before any controller runs. Emitting the same JSON
     * shape here keeps every error the client sees consistent.
     */
    private void writeError(HttpServletResponse response, int status,
                            String error, String message, String path) throws java.io.IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), Map.of(
                "timestamp", Instant.now().toString(),
                "status", status,
                "error", error,
                "message", message,
                "path", path));
    }

    /** Matches the $2a$10$ hashes in V2__seed.sql. */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration)
            throws Exception {
        return configuration.getAuthenticationManager();
    }
}
