package com.dms.service.web;

import com.dms.service.domain.RepairOrder;
import com.dms.service.domain.RepairOrderStatus;
import com.dms.service.service.RepairOrderService;
import com.dms.service.web.dto.AddLineItemRequest;
import com.dms.service.web.dto.RepairOrderResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/repair-orders")
@Tag(name = "Repair Orders", description = "Work orders, billing lines, and inventory draw-down")
public class RepairOrderController {

    private final RepairOrderService repairOrderService;

    public RepairOrderController(RepairOrderService repairOrderService) {
        this.repairOrderService = repairOrderService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SERVICE_ADVISOR','ADMIN')")
    @Operation(summary = "Open a repair order against an appointment")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Opened"),
            @ApiResponse(responseCode = "409", description = "Appointment already has a repair order")
    })
    public ResponseEntity<RepairOrderResponse> open(@RequestParam Long appointmentId,
                                                    @RequestParam(required = false) Long technicianId) {
        RepairOrder ro = repairOrderService.open(appointmentId, technicianId);
        return ResponseEntity
                .created(URI.create("/api/repair-orders/" + ro.getId()))
                .body(RepairOrderResponse.from(repairOrderService.get(ro.getId())));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Fetch a repair order with its lines and totals")
    public RepairOrderResponse get(@PathVariable Long id) {
        return RepairOrderResponse.from(repairOrderService.get(id));
    }

    @GetMapping
    @Operation(summary = "List repair orders by status")
    public List<RepairOrderResponse> listByStatus(
            @RequestParam(defaultValue = "OPEN") RepairOrderStatus status) {
        return repairOrderService.findByStatus(status).stream()
                .map(ro -> RepairOrderResponse.from(repairOrderService.get(ro.getId())))
                .toList();
    }

    @PostMapping("/{id}/line-items")
    @PreAuthorize("hasAnyRole('SERVICE_ADVISOR','ADMIN','TECHNICIAN')")
    @Operation(summary = "Add a billing line",
               description = "PART lines draw down inventory in the same transaction; "
                           + "insufficient stock rolls the whole operation back.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Line added and totals repriced"),
            @ApiResponse(responseCode = "409", description = "Insufficient stock, or concurrent modification"),
            @ApiResponse(responseCode = "404", description = "Repair order or part not found")
    })
    public RepairOrderResponse addLineItem(@PathVariable Long id,
                                           @Valid @RequestBody AddLineItemRequest request) {
        RepairOrder ro = repairOrderService.addLineItem(id, request);
        return RepairOrderResponse.from(repairOrderService.get(ro.getId()));
    }

    @DeleteMapping("/{id}/line-items/{lineItemId}")
    @PreAuthorize("hasAnyRole('SERVICE_ADVISOR','ADMIN')")
    @Operation(summary = "Remove a line and return any consumed stock")
    public RepairOrderResponse removeLineItem(@PathVariable Long id,
                                              @PathVariable Long lineItemId) {
        RepairOrder ro = repairOrderService.removeLineItem(id, lineItemId);
        return RepairOrderResponse.from(repairOrderService.get(ro.getId()));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('SERVICE_ADVISOR','ADMIN','TECHNICIAN')")
    @Operation(summary = "Advance the repair-order state machine",
               description = "Illegal transitions are rejected with 409.")
    public RepairOrderResponse changeStatus(@PathVariable Long id,
                                            @RequestParam RepairOrderStatus target) {
        RepairOrder ro = repairOrderService.changeStatus(id, target);
        return RepairOrderResponse.from(repairOrderService.get(ro.getId()));
    }

    @PutMapping("/{id}/technician")
    @PreAuthorize("hasAnyRole('SERVICE_ADVISOR','ADMIN')")
    @ResponseStatus(HttpStatus.OK)
    @Operation(summary = "Assign a technician")
    public RepairOrderResponse assignTechnician(@PathVariable Long id,
                                                @RequestParam Long technicianId) {
        RepairOrder ro = repairOrderService.assignTechnician(id, technicianId);
        return RepairOrderResponse.from(repairOrderService.get(ro.getId()));
    }
}
