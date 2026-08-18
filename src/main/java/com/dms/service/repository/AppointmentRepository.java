package com.dms.service.repository;

import com.dms.service.domain.Appointment;
import com.dms.service.domain.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    /**
     * True when the bay already has an appointment overlapping [start, end).
     *
     * Overlap test is (existing.start < new.end AND existing.end > new.start).
     * Both comparisons are strict, which treats the window as half-open, so an
     * appointment ending at 10:00 and one starting at 10:00 do NOT collide.
     * Using <= / >= here would reject legitimate back-to-back bookings.
     *
     * Backed by idx_appt_bay_window. Callers MUST hold the pessimistic lock from
     * ServiceBayRepository#findByIdForUpdate before relying on this result.
     */
    @Query("""
           select count(a) > 0
           from Appointment a
           where a.bay.id = :bayId
             and a.status not in :ignoredStatuses
             and a.scheduledStart < :end
             and a.scheduledEnd   > :start
           """)
    boolean existsOverlapping(@Param("bayId") Long bayId,
                              @Param("start") LocalDateTime start,
                              @Param("end") LocalDateTime end,
                              @Param("ignoredStatuses") Collection<AppointmentStatus> ignoredStatuses);

    /** Same overlap test, ignoring one appointment — used when rescheduling it. */
    @Query("""
           select count(a) > 0
           from Appointment a
           where a.bay.id = :bayId
             and a.id <> :excludeId
             and a.status not in :ignoredStatuses
             and a.scheduledStart < :end
             and a.scheduledEnd   > :start
           """)
    boolean existsOverlappingExcluding(@Param("bayId") Long bayId,
                                       @Param("start") LocalDateTime start,
                                       @Param("end") LocalDateTime end,
                                       @Param("excludeId") Long excludeId,
                                       @Param("ignoredStatuses") Collection<AppointmentStatus> ignoredStatuses);

    /**
     * Fetch-joins the associations a detail view needs, so rendering one
     * appointment costs one query instead of four lazy hits.
     */
    @Query("""
           select a from Appointment a
             join fetch a.vehicle v
             join fetch v.customer
             join fetch a.bay
             join fetch a.advisor
           where a.id = :id
           """)
    Optional<Appointment> findByIdWithDetails(@Param("id") Long id);

    List<Appointment> findByBayIdAndScheduledStartBetween(Long bayId,
                                                          LocalDateTime from,
                                                          LocalDateTime to);

    List<Appointment> findByStatus(AppointmentStatus status);
}
