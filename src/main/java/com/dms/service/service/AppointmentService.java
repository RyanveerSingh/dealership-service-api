package com.dms.service.service;

import com.dms.service.domain.*;
import com.dms.service.exception.IllegalStateTransitionException;
import com.dms.service.exception.ResourceNotFoundException;
import com.dms.service.exception.SchedulingConflictException;
import com.dms.service.repository.AppointmentRepository;
import com.dms.service.repository.ServiceBayRepository;
import com.dms.service.repository.UserRepository;
import com.dms.service.repository.VehicleRepository;
import com.dms.service.web.dto.BookAppointmentRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/**
 * Booking and lifecycle for appointments.
 *
 * The booking path is the reason this project exists; see {@link #book}.
 */
@Service
public class AppointmentService {

    private static final Logger log = LoggerFactory.getLogger(AppointmentService.class);

    /**
     * A cancelled appointment releases its slot. Everything else — including
     * COMPLETED — still counts as having occupied the bay.
     */
    private static final Set<AppointmentStatus> NON_BLOCKING =
            EnumSet.of(AppointmentStatus.CANCELLED);

    private final AppointmentRepository appointmentRepository;
    private final ServiceBayRepository serviceBayRepository;
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;

    public AppointmentService(AppointmentRepository appointmentRepository,
                              ServiceBayRepository serviceBayRepository,
                              VehicleRepository vehicleRepository,
                              UserRepository userRepository) {
        this.appointmentRepository = appointmentRepository;
        this.serviceBayRepository = serviceBayRepository;
        this.vehicleRepository = vehicleRepository;
        this.userRepository = userRepository;
    }

    /**
     * Books a bay for a window, rejecting overlaps.
     *
     * The ordering inside this transaction is the entire mechanism:
     *
     *   1. SELECT ... FOR UPDATE on the bay row  (findByIdForUpdate)
     *   2. overlap query against appointments
     *   3. INSERT the new appointment
     *
     * Step 1 must precede step 2. Two concurrent bookings for the same bay both
     * reach step 1, but only one holds the lock; the loser blocks until the
     * winner commits, and then sees the winner's row in its own step 2. Reverse
     * the order and both would read "no overlap" before either inserted, and both
     * inserts would succeed — the classic write-skew double booking.
     *
     * A @Version column on the bay would NOT fix this. Optimistic locking detects
     * concurrent edits to a row you read; here nobody edits the bay at all. The
     * hazard is an appointment row that did not exist when you looked — a phantom.
     * Serialising on the parent row is what eliminates it.
     *
     * Note also that no unique constraint can express "no overlapping range" in
     * MySQL, so the database cannot be the backstop here the way it is for stock
     * levels. The lock is doing real work.
     */
    @Transactional
    public Appointment book(BookAppointmentRequest request, Long advisorId) {
        if (!request.hasValidWindow()) {
            throw new IllegalArgumentException("scheduledEnd must be after scheduledStart");
        }

        Vehicle vehicle = vehicleRepository.findById(request.vehicleId())
                .orElseThrow(() -> ResourceNotFoundException.of("Vehicle", request.vehicleId()));

        User advisor = userRepository.findById(advisorId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", advisorId));

        // (1) Acquire the row lock before reading anything that must stay stable.
        ServiceBay bay = serviceBayRepository.findByIdForUpdate(request.bayId())
                .orElseThrow(() -> ResourceNotFoundException.of("ServiceBay", request.bayId()));

        if (!bay.isActive()) {
            throw new SchedulingConflictException("Bay " + bay.getName() + " is out of service");
        }

        // (2) Safe to trust this result only because of the lock taken above.
        boolean clash = appointmentRepository.existsOverlapping(
                bay.getId(), request.scheduledStart(), request.scheduledEnd(), NON_BLOCKING);

        if (clash) {
            throw new SchedulingConflictException(
                    "Bay " + bay.getName() + " is already booked between "
                    + request.scheduledStart() + " and " + request.scheduledEnd());
        }

        // (3) Commit releases the lock and lets the next booker proceed.
        Appointment appointment = Appointment.builder()
                .vehicle(vehicle)
                .bay(bay)
                .advisor(advisor)
                .scheduledStart(request.scheduledStart())
                .scheduledEnd(request.scheduledEnd())
                .status(AppointmentStatus.SCHEDULED)
                .notes(request.notes())
                .build();

        Appointment saved = appointmentRepository.save(appointment);
        log.info("Booked appointment {} in bay {} for {}",
                saved.getId(), bay.getName(), request.scheduledStart());
        return saved;
    }

    /** Moves an existing appointment, re-running the same guarded overlap check. */
    @Transactional
    public Appointment reschedule(Long appointmentId, BookAppointmentRequest request) {
        if (!request.hasValidWindow()) {
            throw new IllegalArgumentException("scheduledEnd must be after scheduledStart");
        }

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> ResourceNotFoundException.of("Appointment", appointmentId));

        if (appointment.getStatus().isTerminal()) {
            throw new IllegalStateTransitionException(
                    "Cannot reschedule an appointment in state " + appointment.getStatus());
        }

        ServiceBay bay = serviceBayRepository.findByIdForUpdate(request.bayId())
                .orElseThrow(() -> ResourceNotFoundException.of("ServiceBay", request.bayId()));

        // Excludes itself, otherwise the appointment would always clash with its
        // own current window.
        boolean clash = appointmentRepository.existsOverlappingExcluding(
                bay.getId(), request.scheduledStart(), request.scheduledEnd(),
                appointmentId, NON_BLOCKING);

        if (clash) {
            throw new SchedulingConflictException(
                    "Bay " + bay.getName() + " is already booked for that window");
        }

        appointment.setBay(bay);
        appointment.setScheduledStart(request.scheduledStart());
        appointment.setScheduledEnd(request.scheduledEnd());
        if (request.notes() != null) {
            appointment.setNotes(request.notes());
        }
        return appointment;
    }

    /** Applies a status change, rejecting edges the state machine forbids. */
    @Transactional
    public Appointment changeStatus(Long appointmentId, AppointmentStatus target) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> ResourceNotFoundException.of("Appointment", appointmentId));

        AppointmentStatus current = appointment.getStatus();
        if (current == target) {
            return appointment;
        }
        if (!current.canTransitionTo(target)) {
            throw IllegalStateTransitionException.of("Appointment", current, target);
        }

        appointment.setStatus(target);
        log.info("Appointment {} moved {} -> {}", appointmentId, current, target);
        return appointment;
    }

    @Transactional(readOnly = true)
    public Appointment getWithDetails(Long id) {
        return appointmentRepository.findByIdWithDetails(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Appointment", id));
    }

    @Transactional(readOnly = true)
    public List<Appointment> findByStatus(AppointmentStatus status) {
        return appointmentRepository.findByStatus(status);
    }
}
