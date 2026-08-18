package com.dms.service.domain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class RepairOrderTest {

    private static final BigDecimal TAX_18 = new BigDecimal("0.18");

    private RoLineItem part(String desc, int qty, String price) {
        return RoLineItem.builder()
                .lineType(LineType.PART)
                .part(Part.builder().id(1L).sku("BRK-PAD-FRT").build())
                .description(desc)
                .quantity(qty)
                .unitPrice(new BigDecimal(price))
                .build();
    }

    private RoLineItem labor(String desc, int qty, String price) {
        return RoLineItem.builder()
                .lineType(LineType.LABOR)
                .description(desc)
                .quantity(qty)
                .unitPrice(new BigDecimal(price))
                .build();
    }

    @Test
    @DisplayName("splits parts and labour, then taxes the combined subtotal")
    void totalsSplitByLineType() {
        RepairOrder ro = RepairOrder.builder().status(RepairOrderStatus.OPEN).build();
        ro.addLineItem(part("Front brake pads", 2, "3200.00"));
        ro.addLineItem(labor("Brake service", 1, "1500.00"));

        ro.recalculateTotals(TAX_18);

        assertThat(ro.getPartsTotal()).isEqualByComparingTo("6400.00");
        assertThat(ro.getLaborTotal()).isEqualByComparingTo("1500.00");
        // 18% of 7900
        assertThat(ro.getTaxTotal()).isEqualByComparingTo("1422.00");
        assertThat(ro.getGrandTotal()).isEqualByComparingTo("9322.00");
    }

    @Test
    @DisplayName("an empty order totals zero rather than null")
    void emptyOrderTotalsZero() {
        RepairOrder ro = RepairOrder.builder().status(RepairOrderStatus.OPEN).build();

        ro.recalculateTotals(TAX_18);

        assertThat(ro.getPartsTotal()).isEqualByComparingTo("0.00");
        assertThat(ro.getGrandTotal()).isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("addLineItem sets the back-reference and computes the line total")
    void addLineItemMaintainsBothSides() {
        RepairOrder ro = RepairOrder.builder().status(RepairOrderStatus.OPEN).build();
        RoLineItem item = part("Front brake pads", 3, "3200.00");

        ro.addLineItem(item);

        assertThat(item.getRepairOrder()).isSameAs(ro);
        assertThat(item.getLineTotal()).isEqualByComparingTo("9600.00");
        assertThat(ro.getLineItems()).containsExactly(item);
    }

    @Test
    @DisplayName("removing a line drops it from the totals")
    void removingLineRepricesOrder() {
        RepairOrder ro = RepairOrder.builder().status(RepairOrderStatus.OPEN).build();
        RoLineItem keep = part("Pads", 1, "3200.00");
        RoLineItem drop = labor("Diagnostic", 1, "1000.00");
        ro.addLineItem(keep);
        ro.addLineItem(drop);
        ro.recalculateTotals(TAX_18);
        assertThat(ro.getGrandTotal()).isEqualByComparingTo("4956.00");

        ro.removeLineItem(drop);
        ro.recalculateTotals(TAX_18);

        assertThat(ro.getLaborTotal()).isEqualByComparingTo("0.00");
        assertThat(ro.getGrandTotal()).isEqualByComparingTo("3776.00");
    }

    @Test
    @DisplayName("money keeps two decimal places and does not drift")
    void moneyScaleIsStable() {
        RepairOrder ro = RepairOrder.builder().status(RepairOrderStatus.OPEN).build();
        // A rate that would expose binary floating-point error if double were used.
        ro.addLineItem(labor("Odd rate", 3, "0.10"));

        ro.recalculateTotals(TAX_18);

        assertThat(ro.getLaborTotal()).isEqualByComparingTo("0.30");
        assertThat(ro.getLaborTotal().scale()).isEqualTo(2);
    }

    @Test
    @DisplayName("a part line's total is quantity times unit price")
    void lineTotalIsQuantityTimesPrice() {
        RoLineItem item = part("Pads", 4, "3200.00");
        item.recalculateLineTotal();
        assertThat(item.getLineTotal()).isEqualByComparingTo("12800.00");
    }
}
