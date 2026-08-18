package com.dms.service.service;

import com.dms.service.config.BillingProperties;
import com.dms.service.domain.*;
import com.dms.service.exception.IllegalStateTransitionException;
import com.dms.service.exception.InsufficientStockException;
import com.dms.service.exception.ResourceNotFoundException;
import com.dms.service.repository.AppointmentRepository;
import com.dms.service.repository.PartRepository;
import com.dms.service.repository.RepairOrderRepository;
import com.dms.service.repository.UserRepository;
import com.dms.service.web.dto.AddLineItemRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Repair-order lifecycle and billing.
 *
 * This is the optimistic half of the concurrency story; see {@link #addLineItem}.
 */
@Service
public class RepairOrderService {

    private static final Logger log = LoggerFactory.getLogger(RepairOrderService.class);

    private final RepairOrderRepository repairOrderRepository;
    private final AppointmentRepository appointmentRepository;
    private final PartRepository partRepository;
    private final UserRepository userRepository;
    private final BillingProperties billing;

    public RepairOrderService(RepairOrderRepository repairOrderRepository,
                              AppointmentRepository appointmentRepository,
                              PartRepository partRepository,
                              UserRepository userRepository,
                              BillingProperties billing) {
        this.repairOrderRepository = repairOrderRepository;
        this.appointmentRepository = appointmentRepository;
        this.partRepository = partRepository;
        this.userRepository = userRepository;
        this.billing = billing;
    }

    /** Opens the single repair order permitted for an appointment. */
    @Transactional
    public RepairOrder open(Long appointmentId, Long technicianId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> ResourceNotFoundException.of("Appointment", appointmentId));

        // uq_ro_appointment would catch this too, but a clear 409 beats a raw
        // constraint-violation surfacing from the driver.
        if (repairOrderRepository.existsByAppointmentId(appointmentId)) {
            throw new IllegalStateTransitionException(
                    "Appointment " + appointmentId + " already has a repair order");
        }

        User technician = null;
        if (technicianId != null) {
            technician = userRepository.findById(technicianId)
                    .orElseThrow(() -> ResourceNotFoundException.of("User", technicianId));
            if (technician.getRole() != Role.TECHNICIAN) {
                throw new IllegalArgumentException("User " + technicianId + " is not a technician");
            }
        }

        RepairOrder ro = RepairOrder.builder()
                .appointment(appointment)
                .technician(technician)
                .status(RepairOrderStatus.OPEN)
                .build();

        RepairOrder saved = repairOrderRepository.save(ro);
        log.info("Opened repair order {} for appointment {}", saved.getId(), appointmentId);
        return saved;
    }

    /**
     * Adds a line and, for PART lines, draws the quantity down from inventory.
     *
     * Two mechanisms are at work.
     *
     * Atomicity: the stock decrement and the line insert share one transaction.
     * If stock is short we throw, the transaction rolls back, and neither the
     * decrement nor the line survives. There is no window in which inventory has
     * been reduced for a line that was never recorded.
     *
     * Isolation: Part carries a @Version, so if another transaction changed the
     * same row between our read and our flush, the UPDATE matches zero rows and
     * Hibernate raises OptimisticLockingFailureException. That is the lost-update
     * problem — without it, two concurrent draws of 3 from a stock of 10 could
     * both write 7 instead of 4.
     *
     * @Retryable re-runs the whole method on that failure. The retry proxy sits
     * outside the transaction proxy, so each attempt re-reads the row and gets a
     * fresh version. Retrying inside the failed transaction would be useless.
     *
     * Contrast with bay booking, which cannot use this approach: there the
     * conflicting row does not exist at read time, so there is no version to
     * compare and only a pessimistic lock is sufficient.
     */
    @Retryable(retryFor = OptimisticLockingFailureException.class,
               maxAttempts = 3,
               backoff = @Backoff(delay = 50, multiplier = 2))
    @Transactional
    public RepairOrder addLineItem(Long repairOrderId, AddLineItemRequest request) {
        if (!request.hasConsistentPartReference()) {
            throw new IllegalArgumentException(
                    "A PART line requires partId; a LABOR line must not carry one");
        }

        RepairOrder ro = repairOrderRepository.findByIdWithLineItems(repairOrderId)
                .orElseThrow(() -> ResourceNotFoundException.of("RepairOrder", repairOrderId));

        if (ro.getStatus().isTerminal()) {
            throw new IllegalStateTransitionException(
                    "Cannot modify a repair order in state " + ro.getStatus());
        }

        RoLineItem item = RoLineItem.builder()
                .lineType(request.lineType())
                .description(request.description())
                .quantity(request.quantity())
                .build();

        if (request.isPartLine()) {
            Part part = partRepository.findById(request.partId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Part", request.partId()));

            if (part.getStockQuantity() < request.quantity()) {
                // Rolls the whole transaction back — see the method comment.
                throw new InsufficientStockException(
                        part.getSku(), request.quantity(), part.getStockQuantity());
            }

            part.setStockQuantity(part.getStockQuantity() - request.quantity());

            item.setPart(part);
            // Price comes from inventory, never from the request: otherwise a
            // client could invoice itself a part at zero.
            item.setUnitPrice(part.getUnitPrice());

            if (part.isBelowReorderLevel()) {
                log.warn("Part {} at {} units, at or below reorder level {}",
                        part.getSku(), part.getStockQuantity(), part.getReorderLevel());
            }
        } else {
            if (request.unitPrice() == null) {
                throw new IllegalArgumentException("unitPrice is required for LABOR lines");
            }
            item.setUnitPrice(request.unitPrice());
        }

        ro.addLineItem(item);
        ro.recalculateTotals(billing.taxRate());
        return ro;
    }

    /** Removes a line and returns any consumed stock to inventory. */
    @Transactional
    public RepairOrder removeLineItem(Long repairOrderId, Long lineItemId) {
        RepairOrder ro = repairOrderRepository.findByIdWithLineItems(repairOrderId)
                .orElseThrow(() -> ResourceNotFoundException.of("RepairOrder", repairOrderId));

        if (ro.getStatus().isTerminal()) {
            throw new IllegalStateTransitionException(
                    "Cannot modify a repair order in state " + ro.getStatus());
        }

        RoLineItem item = ro.getLineItems().stream()
                .filter(li -> li.getId().equals(lineItemId))
                .findFirst()
                .orElseThrow(() -> ResourceNotFoundException.of("RoLineItem", lineItemId));

        if (item.getLineType() == LineType.PART && item.getPart() != null) {
            Part part = item.getPart();
            part.setStockQuantity(part.getStockQuantity() + item.getQuantity());
        }

        ro.removeLineItem(item);
        ro.recalculateTotals(billing.taxRate());
        return ro;
    }

    /** Applies a status change, rejecting edges the state machine forbids. */
    @Transactional
    public RepairOrder changeStatus(Long repairOrderId, RepairOrderStatus target) {
        RepairOrder ro = repairOrderRepository.findByIdWithLineItems(repairOrderId)
                .orElseThrow(() -> ResourceNotFoundException.of("RepairOrder", repairOrderId));

        RepairOrderStatus current = ro.getStatus();
        if (current == target) {
            return ro;
        }
        if (!current.canTransitionTo(target)) {
            throw IllegalStateTransitionException.of("RepairOrder", current, target);
        }

        ro.setStatus(target);
        if (target == RepairOrderStatus.CLOSED || target == RepairOrderStatus.VOIDED) {
            ro.setClosedAt(Instant.now());
        }

        log.info("Repair order {} moved {} -> {}", repairOrderId, current, target);
        return ro;
    }

    @Transactional
    public RepairOrder assignTechnician(Long repairOrderId, Long technicianId) {
        RepairOrder ro = repairOrderRepository.findByIdWithLineItems(repairOrderId)
                .orElseThrow(() -> ResourceNotFoundException.of("RepairOrder", repairOrderId));

        User technician = userRepository.findById(technicianId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", technicianId));

        if (technician.getRole() != Role.TECHNICIAN) {
            throw new IllegalArgumentException("User " + technicianId + " is not a technician");
        }

        ro.setTechnician(technician);
        return ro;
    }

    @Transactional(readOnly = true)
    public RepairOrder get(Long id) {
        return repairOrderRepository.findByIdWithLineItems(id)
                .orElseThrow(() -> ResourceNotFoundException.of("RepairOrder", id));
    }

    @Transactional(readOnly = true)
    public List<RepairOrder> findByStatus(RepairOrderStatus status) {
        return repairOrderRepository.findByStatus(status);
    }
}
