package com.dms.service.domain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.assertj.core.api.Assertions.assertThat;

class AppointmentStatusTest {

    @Test
    @DisplayName("the happy path walks SCHEDULED -> CHECKED_IN -> IN_PROGRESS -> COMPLETED")
    void happyPath() {
        assertThat(AppointmentStatus.SCHEDULED.canTransitionTo(AppointmentStatus.CHECKED_IN)).isTrue();
        assertThat(AppointmentStatus.CHECKED_IN.canTransitionTo(AppointmentStatus.IN_PROGRESS)).isTrue();
        assertThat(AppointmentStatus.IN_PROGRESS.canTransitionTo(AppointmentStatus.COMPLETED)).isTrue();
    }

    @Test
    @DisplayName("stages cannot be skipped")
    void cannotSkipStages() {
        assertThat(AppointmentStatus.SCHEDULED.canTransitionTo(AppointmentStatus.IN_PROGRESS)).isFalse();
        assertThat(AppointmentStatus.SCHEDULED.canTransitionTo(AppointmentStatus.COMPLETED)).isFalse();
        assertThat(AppointmentStatus.CHECKED_IN.canTransitionTo(AppointmentStatus.COMPLETED)).isFalse();
    }

    @ParameterizedTest
    @EnumSource(value = AppointmentStatus.class,
                names = {"SCHEDULED", "CHECKED_IN", "IN_PROGRESS"})
    @DisplayName("an appointment can be cancelled until it completes")
    void cancellableUntilComplete(AppointmentStatus live) {
        assertThat(live.canTransitionTo(AppointmentStatus.CANCELLED)).isTrue();
    }

    @Test
    @DisplayName("a completed appointment cannot be cancelled after the fact")
    void completedCannotBeCancelled() {
        assertThat(AppointmentStatus.COMPLETED.canTransitionTo(AppointmentStatus.CANCELLED)).isFalse();
        assertThat(AppointmentStatus.COMPLETED.isTerminal()).isTrue();
    }

    @Test
    @DisplayName("a cancelled appointment cannot be revived")
    void cancelledIsFinal() {
        assertThat(AppointmentStatus.CANCELLED.isTerminal()).isTrue();
        assertThat(AppointmentStatus.CANCELLED.allowedNext()).isEmpty();
    }
}
