package com.dms.service.domain;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Set;

/**
 * Appointment lifecycle. Mirrors ck_appt_status in V1__init.sql.
 *
 * The legal edges live here rather than in the service so there is exactly one
 * place to read the rules and one place to change them.
 */
public enum AppointmentStatus {
    SCHEDULED,
    CHECKED_IN,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED;

    private static final Set<AppointmentStatus> NONE = Collections.emptySet();

    /** Statuses reachable in one step from this one. */
    public Set<AppointmentStatus> allowedNext() {
        return switch (this) {
            case SCHEDULED   -> EnumSet.of(CHECKED_IN, CANCELLED);
            case CHECKED_IN  -> EnumSet.of(IN_PROGRESS, CANCELLED);
            case IN_PROGRESS -> EnumSet.of(COMPLETED, CANCELLED);
            // COMPLETED and CANCELLED are terminal.
            case COMPLETED, CANCELLED -> NONE;
        };
    }

    public boolean canTransitionTo(AppointmentStatus target) {
        return allowedNext().contains(target);
    }

    public boolean isTerminal() {
        return allowedNext().isEmpty();
    }
}
