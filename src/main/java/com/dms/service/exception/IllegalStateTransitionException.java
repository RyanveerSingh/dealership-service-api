package com.dms.service.exception;

/**
 * Maps to 409. Raised when a caller asks for a status change the state machine
 * does not permit, e.g. CLOSED -> IN_PROGRESS.
 */
public class IllegalStateTransitionException extends RuntimeException {

    public IllegalStateTransitionException(String message) {
        super(message);
    }

    public static IllegalStateTransitionException of(String entity, Object from, Object to) {
        return new IllegalStateTransitionException(
                entity + " cannot move from " + from + " to " + to);
    }
}
