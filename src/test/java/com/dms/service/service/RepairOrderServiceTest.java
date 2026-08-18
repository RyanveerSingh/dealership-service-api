package com.dms.service.service;

import com.dms.service.config.BillingProperties;
import com.dms.service.domain.*;
import com.dms.service.exception.IllegalStateTransitionException;
import com.dms.service.exception.InsufficientStockException;
import com.dms.service.repository.AppointmentRepository;
import com.dms.service.repository.PartRepository;
import com.dms.service.repository.RepairOrderRepository;
import com.dms.service.repository.UserRepository;
import com.dms.service.web.dto.AddLineItemRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RepairOrderServiceTest {

    @Mock private RepairOrderRepository repairOrderRepository;
    @Mock private AppointmentRepository appointmentRepository;
    @Mock private PartRepository partRepository;
    @Mock private UserRepository userRepository;

    private RepairOrderService service;

    private RepairOrder openOrder;
    private Part brakePads;

    @BeforeEach
    void setUp() {
        service = new RepairOrderService(repairOrderRepository, appointmentRepository,
                partRepository, userRepository,
                new BillingProperties(new BigDecimal("0.18")));

        openOrder = RepairOrder.builder()
                .id(1L)
                .appointment(Appointment.builder().id(1L).build())
                .status(RepairOrderStatus.OPEN)
                .build();

        brakePads = Part.builder()
                .id(3L).sku("BRK-PAD-FRT").name("Brake Pad Set (Front)")
                .unitPrice(new BigDecimal("3200.00"))
                .stockQuantity(4).reorderLevel(2)
                .build();
    }

    @Test
    @DisplayName("a part line draws the quantity down from inventory")
    void partLineDecrementsStock() {
        when(repairOrderRepository.findByIdWithLineItems(1L)).thenReturn(Optional.of(openOrder));
        when(partRepository.findById(3L)).thenReturn(Optional.of(brakePads));

        service.addLineItem(1L, new AddLineItemRequest(
                LineType.PART, 3L, "Front pads", 2, null));

        assertThat(brakePads.getStockQuantity()).isEqualTo(2);
        assertThat(openOrder.getPartsTotal()).isEqualByComparingTo("6400.00");
    }

    @Test
    @DisplayName("insufficient stock throws and leaves inventory untouched")
    void insufficientStockLeavesStockUnchanged() {
        when(repairOrderRepository.findByIdWithLineItems(1L)).thenReturn(Optional.of(openOrder));
        when(partRepository.findById(3L)).thenReturn(Optional.of(brakePads));

        assertThatThrownBy(() -> service.addLineItem(1L, new AddLineItemRequest(
                LineType.PART, 3L, "Too many", 10, null)))
                .isInstanceOf(InsufficientStockException.class)
                .hasMessageContaining("requested 10")
                .hasMessageContaining("available 4");

        // The throw precedes the mutation; @Transactional rolls back the rest.
        assertThat(brakePads.getStockQuantity()).isEqualTo(4);
        assertThat(openOrder.getLineItems()).isEmpty();
    }

    @Test
    @DisplayName("part pricing comes from inventory, not from the request")
    void partPriceIgnoresClientSuppliedPrice() {
        when(repairOrderRepository.findByIdWithLineItems(1L)).thenReturn(Optional.of(openOrder));
        when(partRepository.findById(3L)).thenReturn(Optional.of(brakePads));

        // A caller trying to invoice premium brake pads at one rupee.
        service.addLineItem(1L, new AddLineItemRequest(
                LineType.PART, 3L, "Cheeky discount", 1, new BigDecimal("1.00")));

        assertThat(openOrder.getLineItems().get(0).getUnitPrice())
                .isEqualByComparingTo("3200.00");
    }

    @Test
    @DisplayName("a labour line does not touch inventory")
    void laborLineDoesNotTouchStock() {
        when(repairOrderRepository.findByIdWithLineItems(1L)).thenReturn(Optional.of(openOrder));

        service.addLineItem(1L, new AddLineItemRequest(
                LineType.LABOR, null, "Diagnostics", 2, new BigDecimal("750.00")));

        assertThat(openOrder.getLaborTotal()).isEqualByComparingTo("1500.00");
        assertThat(openOrder.getPartsTotal()).isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("a PART line without a partId is rejected, mirroring ck_li_partref")
    void partLineRequiresPartId() {
        assertThatThrownBy(() -> service.addLineItem(1L, new AddLineItemRequest(
                LineType.PART, null, "No part reference", 1, null)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("a LABOR line carrying a partId is rejected")
    void laborLineRejectsPartId() {
        assertThatThrownBy(() -> service.addLineItem(1L, new AddLineItemRequest(
                LineType.LABOR, 3L, "Labour with a part", 1, new BigDecimal("100.00"))))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("a closed order cannot take new lines")
    void closedOrderRejectsNewLines() {
        openOrder.setStatus(RepairOrderStatus.CLOSED);
        when(repairOrderRepository.findByIdWithLineItems(1L)).thenReturn(Optional.of(openOrder));

        assertThatThrownBy(() -> service.addLineItem(1L, new AddLineItemRequest(
                LineType.LABOR, null, "Late addition", 1, new BigDecimal("100.00"))))
                .isInstanceOf(IllegalStateTransitionException.class);
    }

    @Test
    @DisplayName("removing a part line returns the stock")
    void removingPartLineRestoresStock() {
        when(repairOrderRepository.findByIdWithLineItems(1L)).thenReturn(Optional.of(openOrder));
        when(partRepository.findById(3L)).thenReturn(Optional.of(brakePads));

        service.addLineItem(1L, new AddLineItemRequest(LineType.PART, 3L, "Pads", 2, null));
        assertThat(brakePads.getStockQuantity()).isEqualTo(2);

        RoLineItem added = openOrder.getLineItems().get(0);
        added.setId(99L);

        service.removeLineItem(1L, 99L);

        assertThat(brakePads.getStockQuantity()).isEqualTo(4);
        assertThat(openOrder.getPartsTotal()).isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("closing an order stamps closedAt")
    void closingStampsClosedAt() {
        openOrder.setStatus(RepairOrderStatus.IN_PROGRESS);
        when(repairOrderRepository.findByIdWithLineItems(1L)).thenReturn(Optional.of(openOrder));

        service.changeStatus(1L, RepairOrderStatus.CLOSED);

        assertThat(openOrder.getStatus()).isEqualTo(RepairOrderStatus.CLOSED);
        assertThat(openOrder.getClosedAt()).isNotNull();
    }

    @Test
    @DisplayName("an illegal transition is rejected")
    void illegalTransitionRejected() {
        when(repairOrderRepository.findByIdWithLineItems(1L)).thenReturn(Optional.of(openOrder));

        assertThatThrownBy(() -> service.changeStatus(1L, RepairOrderStatus.CLOSED))
                .isInstanceOf(IllegalStateTransitionException.class)
                .hasMessageContaining("OPEN")
                .hasMessageContaining("CLOSED");
    }
}
