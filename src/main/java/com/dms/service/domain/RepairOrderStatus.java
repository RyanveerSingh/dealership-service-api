package com.dms.service.domain;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Set;

/**
 * Repair-order lifecycle. Mirrors ck_ro_status in V1__init.sql.
 *
 * This is the state machine the API enforces: an illegal edge is rejected with
 * 409 rather than silently written. VOIDED is reachable from any live state
 * (a job can always be abandoned); CLOSED is only reachable once the work has
 * actually been done or approved.
 */
public enum RepairOrderStatus {
    OPEN,
    AWAITING_PARTS,
    IN_PROGRESS,
    AWAITING_APPROVAL,
    CLOSED,
    VOIDED;

    private static final Set<RepairOrderStatus> NONE = Collections.emptySet();

    /** Statuses reachable in one step from this one. */
    public Set<RepairOrderStatus> allowedNext() {
        return switch (this) {
            case OPEN              -> EnumSet.of(AWAITING_PARTS, IN_PROGRESS, VOIDED);
            case AWAITING_PARTS    -> EnumSet.of(IN_PROGRESS, VOIDED);
            case IN_PROGRESS       -> EnumSet.of(AWAITING_PARTS, AWAITING_APPROVAL, CLOSED, VOIDED);
            case AWAITING_APPROVAL -> EnumSet.of(IN_PROGRESS, CLOSED, VOIDED);
            // CLOSED and VOIDED are terminal: a closed RO is an accounting record.
            case CLOSED, VOIDED    -> NONE;
        };
    }

    public boolean canTransitionTo(RepairOrderStatus target) {
        return allowedNext().contains(target);
    }

    public boolean isTerminal() {
        return allowedNext().isEmpty();
    }
}
