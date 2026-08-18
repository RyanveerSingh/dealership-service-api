package com.dms.service.web.dto;

import com.dms.service.domain.Appointment;

import java.time.LocalDateTime;

public record AppointmentResponse(
        Long id,
        Long vehicleId,
        String vehicleVin,
        Long bayId,
        String bayName,
        Long advisorId,
        String advisorName,
        LocalDateTime scheduledStart,
        LocalDateTime scheduledEnd,
        String status,
        String notes
) {
    /**
     * Caller must ensure the lazy associations are loaded (use
     * findByIdWithDetails) or this triggers extra selects.
     */
    public static AppointmentResponse from(Appointment a) {
        return new AppointmentResponse(
                a.getId(),
                a.getVehicle().getId(),
                a.getVehicle().getVin(),
                a.getBay().getId(),
                a.getBay().getName(),
                a.getAdvisor().getId(),
                a.getAdvisor().getFullName(),
                a.getScheduledStart(),
                a.getScheduledEnd(),
                a.getStatus().name(),
                a.getNotes());
    }
}
