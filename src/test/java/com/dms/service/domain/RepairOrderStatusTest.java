package com.dms.service.domain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.assertj.core.api.Assertions.assertThat;

class RepairOrderStatusTest {

    @Test
    @DisplayName("a fresh order can start work, wait on parts, or be voided")
    void openTransitions() {
        assertThat(RepairOrderStatus.OPEN.allowedNext())
                .containsExactlyInAnyOrder(
                        RepairOrderStatus.AWAITING_PARTS,
                        RepairOrderStatus.IN_PROGRESS,
                        RepairOrderStatus.VOIDED);
    }

    @Test
    @DisplayName("an order cannot be closed straight from OPEN without work happening")
    void cannotCloseFromOpen() {
        assertThat(RepairOrderStatus.OPEN.canTransitionTo(RepairOrderStatus.CLOSED)).isFalse();
    }

    @ParameterizedTest
    @EnumSource(value = RepairOrderStatus.class, names = {"CLOSED", "VOIDED"})
    @DisplayName("terminal states permit no further transition")
    void terminalStatesAreDeadEnds(RepairOrderStatus terminal) {
        assertThat(terminal.isTerminal()).isTrue();
        assertThat(terminal.allowedNext()).isEmpty();

        for (RepairOrderStatus target : RepairOrderStatus.values()) {
            assertThat(terminal.canTransitionTo(target))
                    .as("%s -> %s must be rejected", terminal, target)
                    .isFalse();
        }
    }

    @Test
    @DisplayName("a closed order cannot be reopened")
    void closedCannotReopen() {
        assertThat(RepairOrderStatus.CLOSED.canTransitionTo(RepairOrderStatus.IN_PROGRESS)).isFalse();
        assertThat(RepairOrderStatus.CLOSED.canTransitionTo(RepairOrderStatus.OPEN)).isFalse();
    }

    @ParameterizedTest
    @EnumSource(value = RepairOrderStatus.class,
                names = {"OPEN", "AWAITING_PARTS", "IN_PROGRESS", "AWAITING_APPROVAL"})
    @DisplayName("every live state can be abandoned")
    void anyLiveStateCanBeVoided(RepairOrderStatus live) {
        assertThat(live.canTransitionTo(RepairOrderStatus.VOIDED)).isTrue();
    }

    @Test
    @DisplayName("closing requires work in progress or approval")
    void closingPaths() {
        assertThat(RepairOrderStatus.IN_PROGRESS.canTransitionTo(RepairOrderStatus.CLOSED)).isTrue();
        assertThat(RepairOrderStatus.AWAITING_APPROVAL.canTransitionTo(RepairOrderStatus.CLOSED)).isTrue();
        assertThat(RepairOrderStatus.AWAITING_PARTS.canTransitionTo(RepairOrderStatus.CLOSED)).isFalse();
    }

    @Test
    @DisplayName("no state lists itself as a next state")
    void noSelfLoops() {
        for (RepairOrderStatus s : RepairOrderStatus.values()) {
            assertThat(s.allowedNext()).as("%s must not loop to itself", s).doesNotContain(s);
        }
    }
}
