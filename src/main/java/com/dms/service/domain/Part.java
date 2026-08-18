package com.dms.service.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Inventory item.
 *
 * Concurrency is optimistic here, deliberately: two advisors consuming the same
 * SKU at the same instant is rare, so paying for a row lock on every read would
 * cost more than it saves. The @Version column is checked on write and a losing
 * writer gets an OptimisticLockException, which the service retries.
 *
 * Contrast with {@link ServiceBay}, which is pessimistic. The difference is
 * conflict probability plus the fact that bay booking is a range query
 * vulnerable to phantom reads.
 */
@Entity
@Table(name = "parts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Part {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sku", nullable = false, length = 40, unique = true)
    private String sku;

    @Column(name = "name", nullable = false, length = 140)
    private String name;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "stock_quantity", nullable = false)
    private Integer stockQuantity;

    @Column(name = "reorder_level", nullable = false)
    private Integer reorderLevel;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    /** True when stock has fallen to or below the reorder threshold. */
    @Transient
    public boolean isBelowReorderLevel() {
        return stockQuantity != null && reorderLevel != null && stockQuantity <= reorderLevel;
    }
}
