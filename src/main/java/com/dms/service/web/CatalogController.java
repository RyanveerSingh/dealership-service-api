package com.dms.service.web;

import com.dms.service.service.CatalogService;
import com.dms.service.web.dto.CatalogDtos.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Positive;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Reference data for the UI: bays, parts, vehicles and customers.
 *
 * Read-only apart from stock receipt, which is an ADMIN operation.
 */
@RestController
@RequestMapping("/api")
@Validated
@Tag(name = "Catalog", description = "Reference data and inventory levels")
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/service-bays")
    @Operation(summary = "List service bays")
    public List<BayResponse> bays() {
        return catalogService.bays();
    }

    @GetMapping("/parts")
    @Operation(summary = "List parts with current stock levels")
    public List<PartResponse> parts() {
        return catalogService.parts();
    }

    @GetMapping("/parts/low-stock")
    @Operation(summary = "Parts at or below their reorder level")
    public List<PartResponse> lowStock() {
        return catalogService.lowStockParts();
    }

    @PostMapping("/parts/{id}/receive")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_ADVISOR')")
    @Operation(summary = "Receive a stock delivery",
               description = "Adds to the current quantity rather than overwriting it.")
    public PartResponse receive(@PathVariable Long id,
                                @RequestParam @Positive(message = "quantity must be positive") int quantity) {
        return catalogService.receiveStock(id, quantity);
    }

    @GetMapping("/vehicles")
    @Operation(summary = "List vehicles with their owners")
    public List<VehicleResponse> vehicles() {
        return catalogService.vehicles();
    }

    @GetMapping("/customers")
    @Operation(summary = "List customers")
    public List<CustomerResponse> customers() {
        return catalogService.customers();
    }
}
