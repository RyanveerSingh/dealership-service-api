package com.dms.service.web.dto;

import com.dms.service.domain.LineType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record AddLineItemRequest(
        @NotNull(message = "lineType is required")
        LineType lineType,

        /** Required for PART lines, must be absent for LABOR — see ck_li_partref. */
        Long partId,

        @NotBlank(message = "description is required")
        @Size(max = 200, message = "description cannot exceed 200 characters")
        String description,

        @NotNull(message = "quantity is required")
        @Positive(message = "quantity must be greater than zero")
        Integer quantity,

        /**
         * Used for LABOR only. On PART lines the price is read from inventory and
         * this field is ignored, so a client cannot set its own parts pricing.
         */
        @DecimalMin(value = "0.0", message = "unitPrice cannot be negative")
        BigDecimal unitPrice
) {
    public boolean isPartLine() {
        return lineType == LineType.PART;
    }

    /** Mirrors the ck_li_partref database constraint. */
    public boolean hasConsistentPartReference() {
        return isPartLine() ? partId != null : partId == null;
    }
}
