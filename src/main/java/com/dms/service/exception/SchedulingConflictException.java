package com.dms.service.exception;

/**
 * Maps to 409. Raised when a requested window overlaps an existing appointment
 * in the same bay — the double-booking guard.
 */
public class SchedulingConflictException extends RuntimeException {

    public SchedulingConflictException(String message) {
        super(message);
    }
}
