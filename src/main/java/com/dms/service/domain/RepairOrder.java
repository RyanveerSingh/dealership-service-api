package com.dms.service.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * The work order raised against an appointment. One RO per appointment, enforced
 * by uq_ro_appointment.
 *
 * Totals are stored rather than computed on read so a closed RO stays an
 * immutable financial record even if a part's price later changes.
 */
@Entity
@Table(name = "repair_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RepairOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "appointment_id", nullable = false, unique = true)
    private Appointment appointment;

    /** Null until a technician is assigned. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "technician_id")
    private User technician;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private RepairOrderStatus status;

    @CreationTimestamp
    @Column(name = "opened_at", nullable = false, updatable = false)
    private Instant openedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Builder.Default
    @Column(name = "parts_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal partsTotal = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "labor_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal laborTotal = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "tax_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal taxTotal = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "grand_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal grandTotal = BigDecimal.ZERO;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    /**
     * orphanRemoval mirrors the ON DELETE CASCADE on fk_li_ro: removing a line
     * from this list deletes the row.
     */
    @OneToMany(mappedBy = "repairOrder", cascade = CascadeType.ALL,
               orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<RoLineItem> lineItems = new ArrayList<>();

    /** Adds a line and keeps both sides of the association consistent. */
    public void addLineItem(RoLineItem item) {
        item.setRepairOrder(this);
        item.recalculateLineTotal();
        this.lineItems.add(item);
    }

    public void removeLineItem(RoLineItem item) {
        this.lineItems.remove(item);
        item.setRepairOrder(null);
    }

    /**
     * Rolls the stored money columns up from the current lines.
     * Call inside the same transaction that mutated the lines.
     */
    public void recalculateTotals(BigDecimal taxRate) {
        BigDecimal parts = BigDecimal.ZERO;
        BigDecimal labor = BigDecimal.ZERO;

        for (RoLineItem item : lineItems) {
            BigDecimal total = item.getLineTotal() == null ? BigDecimal.ZERO : item.getLineTotal();
            if (item.getLineType() == LineType.PART) {
                parts = parts.add(total);
            } else {
                labor = labor.add(total);
            }
        }

        this.partsTotal = parts.setScale(2, RoundingMode.HALF_UP);
        this.laborTotal = labor.setScale(2, RoundingMode.HALF_UP);
        this.taxTotal = parts.add(labor).multiply(taxRate).setScale(2, RoundingMode.HALF_UP);
        this.grandTotal = this.partsTotal.add(this.laborTotal).add(this.taxTotal);
    }
}
