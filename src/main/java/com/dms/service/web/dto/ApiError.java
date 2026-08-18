package com.dms.service.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * One error shape for the whole API. Matches the JSON that SecurityConfig writes
 * for 401/403, so a client never has to parse two formats.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(
        String timestamp,
        int status,
        String error,
        String message,
        String path,
        /** Field-level detail, present only on validation failures. */
        List<Map<String, String>> fieldErrors
) {
    public static ApiError of(int status, String error, String message, String path) {
        return new ApiError(Instant.now().toString(), status, error, message, path, null);
    }

    public static ApiError withFields(int status, String error, String message,
                                      String path, List<Map<String, String>> fieldErrors) {
        return new ApiError(Instant.now().toString(), status, error, message, path, fieldErrors);
    }
}
