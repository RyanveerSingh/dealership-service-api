package com.dms.service.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "email is required")
        @Email(message = "must be a well-formed email address")
        String email,

        @NotBlank(message = "password is required")
        String password
) {
}
