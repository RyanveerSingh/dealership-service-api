package com.dms.service.web;

import com.dms.service.exception.IllegalStateTransitionException;
import com.dms.service.exception.InsufficientStockException;
import com.dms.service.exception.ResourceNotFoundException;
import com.dms.service.exception.SchedulingConflictException;
import com.dms.service.web.dto.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Single place that turns exceptions into HTTP responses.
 *
 * Without this, Spring's default error page leaks stack traces and every
 * controller ends up with its own try/catch. Each handler below maps one failure
 * mode to the status code that actually describes it — notably 409 for the three
 * concurrency and state-machine conflicts, which are the interesting ones here.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(ResourceNotFoundException ex,
                                                   HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, "Not Found", ex.getMessage(), request);
    }

    /** Double-booking attempt. */
    @ExceptionHandler(SchedulingConflictException.class)
    public ResponseEntity<ApiError> handleSchedulingConflict(SchedulingConflictException ex,
                                                             HttpServletRequest request) {
        return build(HttpStatus.CONFLICT, "Scheduling Conflict", ex.getMessage(), request);
    }

    /** Illegal state-machine edge. */
    @ExceptionHandler(IllegalStateTransitionException.class)
    public ResponseEntity<ApiError> handleIllegalTransition(IllegalStateTransitionException ex,
                                                            HttpServletRequest request) {
        return build(HttpStatus.CONFLICT, "Illegal State Transition", ex.getMessage(), request);
    }

    /** Inventory shortfall — the transaction has already been rolled back. */
    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<ApiError> handleInsufficientStock(InsufficientStockException ex,
                                                            HttpServletRequest request) {
        return build(HttpStatus.CONFLICT, "Insufficient Stock", ex.getMessage(), request);
    }

    /**
     * A @Version check lost. The client's read is stale, so the correct advice is
     * "re-read and retry", not "retry blindly".
     */
    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ApiError> handleOptimisticLock(OptimisticLockingFailureException ex,
                                                         HttpServletRequest request) {
        log.warn("Optimistic lock conflict on {}: {}", request.getRequestURI(), ex.getMessage());
        return build(HttpStatus.CONFLICT, "Concurrent Modification",
                "This record was modified by another user. Re-read it and retry.", request);
    }

    /** @Valid failure on a request body: report every bad field at once. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex,
                                                     HttpServletRequest request) {
        List<Map<String, String>> fields = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> {
                    Map<String, String> m = new LinkedHashMap<>();
                    m.put("field", fe.getField());
                    m.put("message", fe.getDefaultMessage() == null ? "invalid" : fe.getDefaultMessage());
                    return m;
                })
                .toList();

        return ResponseEntity.badRequest().body(ApiError.withFields(
                HttpStatus.BAD_REQUEST.value(), "Validation Failed",
                "One or more fields are invalid", request.getRequestURI(), fields));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleConstraintViolation(ConstraintViolationException ex,
                                                              HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "Validation Failed", ex.getMessage(), request);
    }

    /**
     * A database CHECK or UNIQUE constraint rejected the write. Reaching here
     * means application validation missed a case the schema still caught — worth
     * logging loudly, because the schema is the last line of defence.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleDataIntegrity(DataIntegrityViolationException ex,
                                                        HttpServletRequest request) {
        log.warn("Constraint violation at {}", request.getRequestURI(), ex);
        return build(HttpStatus.CONFLICT, "Constraint Violation",
                "The request violates a data integrity rule", request);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiError> handleBadCredentials(BadCredentialsException ex,
                                                         HttpServletRequest request) {
        // Same message for unknown email and wrong password: do not confirm which
        // addresses are registered.
        return build(HttpStatus.UNAUTHORIZED, "Unauthorized", "Invalid email or password", request);
    }

    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<ApiError> handleDisabled(DisabledException ex,
                                                   HttpServletRequest request) {
        return build(HttpStatus.FORBIDDEN, "Account Disabled", "This account is not active", request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex,
                                                       HttpServletRequest request) {
        return build(HttpStatus.FORBIDDEN, "Forbidden",
                "Insufficient role for this operation", request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArgument(IllegalArgumentException ex,
                                                          HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "Bad Request", ex.getMessage(), request);
    }

    /** Catch-all. The message is generic on purpose; the detail goes to the log. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception at {}", request.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error",
                "An unexpected error occurred", request);
    }

    private ResponseEntity<ApiError> build(HttpStatus status, String error,
                                           String message, HttpServletRequest request) {
        return ResponseEntity.status(status)
                .body(ApiError.of(status.value(), error, message, request.getRequestURI()));
    }
}
