package com.dms.service.web.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record BookAppointmentRequest(
        @NotNull(message = "vehicleId is required")
        Long vehicleId,

        @NotNull(message = "bayId is required")
        Long bayId,

        @NotNull(message = "scheduledStart is required")
        @Future(message = "scheduledStart must be in the future")
        LocalDateTime scheduledStart,

        @NotNull(message = "scheduledEnd is required")
        @Future(message = "scheduledEnd must be in the future")
        LocalDateTime scheduledEnd,

        @Size(max = 500, message = "notes cannot exceed 500 characters")
        String notes
) {
    /**
     * end-after-start cannot be expressed with a field-level annotation, so it is
     * checked here. ck_appt_window enforces the same rule in the database.
     */
    public boolean hasValidWindow() {
        return scheduledStart != null && scheduledEnd != null
               && scheduledEnd.isAfter(scheduledStart);
    }
}
