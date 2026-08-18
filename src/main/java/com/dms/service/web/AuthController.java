package com.dms.service.web;

import com.dms.service.security.AppUserPrincipal;
import com.dms.service.security.JwtService;
import com.dms.service.web.dto.LoginRequest;
import com.dms.service.web.dto.LoginResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Token issuance")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthController(AuthenticationManager authenticationManager, JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    @Operation(summary = "Exchange credentials for a bearer token")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        // Delegating to AuthenticationManager rather than comparing hashes here
        // means the BCrypt check, the disabled-account check, and the uniform
        // failure response all come from Spring Security.
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password()));

        AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();
        String token = jwtService.issueToken(principal.getUsername(), principal.getRole().name());

        return ResponseEntity.ok(new LoginResponse(
                token,
                "Bearer",
                jwtService.ttlSeconds(),
                principal.getUsername(),
                principal.getFullName(),
                principal.getRole().name()));
    }

    @GetMapping("/me")
    @Operation(summary = "Identity of the caller behind the presented token")
    public ResponseEntity<LoginResponse> me(@AuthenticationPrincipal AppUserPrincipal principal) {
        return ResponseEntity.ok(new LoginResponse(
                null, "Bearer", 0,
                principal.getUsername(),
                principal.getFullName(),
                principal.getRole().name()));
    }
}
