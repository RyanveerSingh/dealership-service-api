package com.dms.service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.math.BigDecimal;

/**
 * Binds app.billing.*.
 *
 * BigDecimal rather than double: money must never be computed in binary floating
 * point, where 0.1 + 0.2 is not 0.3 and totals drift by cents at scale.
 */
@ConfigurationProperties(prefix = "app.billing")
public record BillingProperties(BigDecimal taxRate) {
}
