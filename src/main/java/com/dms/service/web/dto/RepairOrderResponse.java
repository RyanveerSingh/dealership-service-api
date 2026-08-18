package com.dms.service.web.dto;

import com.dms.service.domain.RepairOrder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record RepairOrderResponse(
        Long id,
        Long appointmentId,
        Long technicianId,
        String technicianName,
        String status,
        Instant openedAt,
        Instant closedAt,
        BigDecimal partsTotal,
        BigDecimal laborTotal,
        BigDecimal taxTotal,
        BigDecimal grandTotal,
        List<String> allowedNextStatuses,
        List<LineItemResponse> lineItems
) {
    public record LineItemResponse(
            Long id,
            String lineType,
            Long partId,
            String partSku,
            String description,
            Integer quantity,
            BigDecimal unitPrice,
            BigDecimal lineTotal
    ) {
    }

    /** Requires the line items to be loaded — use findByIdWithLineItems. */
    public static RepairOrderResponse from(RepairOrder ro) {
        List<LineItemResponse> lines = ro.getLineItems().stream()
                .map(li -> new LineItemResponse(
                        li.getId(),
                        li.getLineType().name(),
                        li.getPart() == null ? null : li.getPart().getId(),
                        li.getPart() == null ? null : li.getPart().getSku(),
                        li.getDescription(),
                        li.getQuantity(),
                        li.getUnitPrice(),
                        li.getLineTotal()))
                .toList();

        // Publishing the legal next states lets a UI grey out the buttons it must
        // not offer, instead of discovering the rule via a 409.
        List<String> next = ro.getStatus().allowedNext().stream()
                .map(Enum::name)
                .sorted()
                .toList();

        return new RepairOrderResponse(
                ro.getId(),
                ro.getAppointment().getId(),
                ro.getTechnician() == null ? null : ro.getTechnician().getId(),
                ro.getTechnician() == null ? null : ro.getTechnician().getFullName(),
                ro.getStatus().name(),
                ro.getOpenedAt(),
                ro.getClosedAt(),
                ro.getPartsTotal(),
                ro.getLaborTotal(),
                ro.getTaxTotal(),
                ro.getGrandTotal(),
                next,
                lines);
    }
}
