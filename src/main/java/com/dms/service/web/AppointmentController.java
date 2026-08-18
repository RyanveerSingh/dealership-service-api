package com.dms.service.web;

import com.dms.service.domain.Appointment;
import com.dms.service.domain.AppointmentStatus;
import com.dms.service.security.AppUserPrincipal;
import com.dms.service.service.AppointmentService;
import com.dms.service.web.dto.AppointmentResponse;
import com.dms.service.web.dto.BookAppointmentRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@Tag(name = "Appointments", description = "Booking and lifecycle")
public class AppointmentController {

    private final AppointmentService appointmentService;

    public AppointmentController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SERVICE_ADVISOR','ADMIN')")
    @Operation(summary = "Book a bay",
               description = "Rejects any window overlapping an existing booking for the same bay.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Booked"),
            @ApiResponse(responseCode = "409", description = "Bay already booked for that window"),
            @ApiResponse(responseCode = "404", description = "Vehicle or bay not found")
    })
    public ResponseEntity<AppointmentResponse> book(
            @Valid @RequestBody BookAppointmentRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        // The advisor is taken from the token, never from the request body — a
        // caller must not be able to book on someone else's behalf.
        Appointment saved = appointmentService.book(request, principal.getId());

        Appointment loaded = appointmentService.getWithDetails(saved.getId());
        return ResponseEntity
                .created(URI.create("/api/appointments/" + saved.getId()))
                .body(AppointmentResponse.from(loaded));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Fetch one appointment")
    public AppointmentResponse get(@PathVariable Long id) {
        return AppointmentResponse.from(appointmentService.getWithDetails(id));
    }

    @GetMapping
    @Operation(summary = "List appointments by status")
    public List<AppointmentResponse> listByStatus(
            @RequestParam(defaultValue = "SCHEDULED") AppointmentStatus status) {
        return appointmentService.findByStatus(status).stream()
                .map(a -> AppointmentResponse.from(appointmentService.getWithDetails(a.getId())))
                .toList();
    }

    @PutMapping("/{id}/schedule")
    @PreAuthorize("hasAnyRole('SERVICE_ADVISOR','ADMIN')")
    @Operation(summary = "Move an appointment to a new bay or window")
    public AppointmentResponse reschedule(@PathVariable Long id,
                                          @Valid @RequestBody BookAppointmentRequest request) {
        Appointment updated = appointmentService.reschedule(id, request);
        return AppointmentResponse.from(appointmentService.getWithDetails(updated.getId()));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('SERVICE_ADVISOR','ADMIN','TECHNICIAN')")
    @Operation(summary = "Advance the appointment state machine",
               description = "Illegal transitions are rejected with 409.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Transition applied"),
            @ApiResponse(responseCode = "409", description = "Illegal transition")
    })
    public AppointmentResponse changeStatus(@PathVariable Long id,
                                            @RequestParam AppointmentStatus target) {
        Appointment updated = appointmentService.changeStatus(id, target);
        return AppointmentResponse.from(appointmentService.getWithDetails(updated.getId()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SERVICE_ADVISOR','ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Cancel an appointment (soft: sets status CANCELLED)")
    public void cancel(@PathVariable Long id) {
        appointmentService.changeStatus(id, AppointmentStatus.CANCELLED);
    }
}
