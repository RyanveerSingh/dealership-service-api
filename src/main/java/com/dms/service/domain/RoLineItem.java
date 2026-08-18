package com.dms.service.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * One billable line on a repair order: either a PART (which draws down inventory)
 * or LABOR (which does not).
 *
 * The PART-implies-part_id rule is enforced by ck_li_partref in the database, so
 * no application bug can persist an inconsistent row.
 */
@Entity
@Table(name = "ro_line_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoLineItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "repair_order_id", nullable = false)
    private RepairOrder repairOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "line_type", nullable = false, length = 10)
    private LineType lineType;

    /** Non-null exactly when lineType is PART. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "part_id")
    private Part part;

    @Column(name = "description", nullable = false, length = 200)
    private String description;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "line_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal lineTotal;

    /** Recomputes line_total from quantity x unit_price. */
    public void recalculateLineTotal() {
        if (quantity != null && unitPrice != null) {
            this.lineTotal = unitPrice.multiply(BigDecimal.valueOf(quantity));
        }
    }
}
