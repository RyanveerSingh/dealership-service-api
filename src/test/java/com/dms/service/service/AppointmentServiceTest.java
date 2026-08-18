package com.dms.service.service;

import com.dms.service.domain.*;
import com.dms.service.exception.ResourceNotFoundException;
import com.dms.service.exception.SchedulingConflictException;
import com.dms.service.repository.AppointmentRepository;
import com.dms.service.repository.ServiceBayRepository;
import com.dms.service.repository.UserRepository;
import com.dms.service.repository.VehicleRepository;
import com.dms.service.web.dto.BookAppointmentRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AppointmentServiceTest {

    @Mock private AppointmentRepository appointmentRepository;
    @Mock private ServiceBayRepository serviceBayRepository;
    @Mock private VehicleRepository vehicleRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks private AppointmentService appointmentService;

    private Vehicle vehicle;
    private ServiceBay bay;
    private User advisor;
    private BookAppointmentRequest request;

    @BeforeEach
    void setUp() {
        vehicle = Vehicle.builder().id(1L).vin("1HGCM82633A004352").build();
        bay = ServiceBay.builder().id(1L).name("Bay 1").active(true).build();
        advisor = User.builder().id(2L).email("advisor@dms.local")
                .fullName("Priya Advisor").role(Role.SERVICE_ADVISOR).active(true).build();

        request = new BookAppointmentRequest(1L, 1L,
                LocalDateTime.of(2030, 1, 1, 9, 0),
                LocalDateTime.of(2030, 1, 1, 10, 0),
                "oil change");
    }

    private void stubLookups() {
        when(vehicleRepository.findById(1L)).thenReturn(Optional.of(vehicle));
        when(userRepository.findById(2L)).thenReturn(Optional.of(advisor));
        when(serviceBayRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(bay));
    }

    @Test
    @DisplayName("books when the bay is free")
    void booksWhenFree() {
        stubLookups();
        when(appointmentRepository.existsOverlapping(eq(1L), any(), any(), any())).thenReturn(false);
        when(appointmentRepository.save(any(Appointment.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        Appointment result = appointmentService.book(request, 2L);

        assertThat(result.getStatus()).isEqualTo(AppointmentStatus.SCHEDULED);
        assertThat(result.getBay()).isEqualTo(bay);
        assertThat(result.getAdvisor()).isEqualTo(advisor);
        verify(appointmentRepository).save(any(Appointment.class));
    }

    @Test
    @DisplayName("rejects an overlapping window and writes nothing")
    void rejectsOverlap() {
        stubLookups();
        when(appointmentRepository.existsOverlapping(eq(1L), any(), any(), any())).thenReturn(true);

        assertThatThrownBy(() -> appointmentService.book(request, 2L))
                .isInstanceOf(SchedulingConflictException.class)
                .hasMessageContaining("Bay 1");

        verify(appointmentRepository, never()).save(any());
    }

    /**
     * The invariant this whole design rests on.
     *
     * If the overlap query ran before the bay row was locked, two concurrent
     * bookings could both read "free" and both insert. Asserting the call order
     * here means a future refactor that reorders these two lines fails the build
     * rather than silently reintroducing the double-booking race.
     */
    @Test
    @DisplayName("takes the pessimistic bay lock BEFORE running the overlap query")
    void locksBayBeforeCheckingOverlap() {
        stubLookups();
        when(appointmentRepository.existsOverlapping(eq(1L), any(), any(), any())).thenReturn(false);
        when(appointmentRepository.save(any(Appointment.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        appointmentService.book(request, 2L);

        InOrder inOrder = inOrder(serviceBayRepository, appointmentRepository);
        inOrder.verify(serviceBayRepository).findByIdForUpdate(1L);
        inOrder.verify(appointmentRepository).existsOverlapping(eq(1L), any(), any(), any());
        inOrder.verify(appointmentRepository).save(any(Appointment.class));
    }

    @Test
    @DisplayName("a cancelled appointment does not hold the slot")
    void cancelledDoesNotBlock() {
        stubLookups();
        when(appointmentRepository.existsOverlapping(eq(1L), any(), any(), any())).thenReturn(false);
        when(appointmentRepository.save(any(Appointment.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        appointmentService.book(request, 2L);

        @SuppressWarnings("unchecked")
        var captor = org.mockito.ArgumentCaptor.forClass(Collection.class);
        verify(appointmentRepository).existsOverlapping(eq(1L), any(), any(), captor.capture());

        assertThat(captor.getValue()).containsExactly(AppointmentStatus.CANCELLED);
    }

    @Test
    @DisplayName("refuses to book an out-of-service bay")
    void rejectsInactiveBay() {
        bay.setActive(false);
        stubLookups();

        assertThatThrownBy(() -> appointmentService.book(request, 2L))
                .isInstanceOf(SchedulingConflictException.class)
                .hasMessageContaining("out of service");

        verify(appointmentRepository, never()).existsOverlapping(any(), any(), any(), any());
    }

    @Test
    @DisplayName("rejects an end time that is not after the start")
    void rejectsInvertedWindow() {
        BookAppointmentRequest bad = new BookAppointmentRequest(1L, 1L,
                LocalDateTime.of(2030, 1, 1, 10, 0),
                LocalDateTime.of(2030, 1, 1, 9, 0),
                null);

        assertThatThrownBy(() -> appointmentService.book(bad, 2L))
                .isInstanceOf(IllegalArgumentException.class);

        // Fails before touching the database at all.
        verifyNoInteractions(serviceBayRepository);
    }

    @Test
    @DisplayName("404s on an unknown vehicle")
    void unknownVehicle() {
        when(vehicleRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> appointmentService.book(request, 2L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Vehicle");
    }

    @Test
    @DisplayName("rejects an illegal appointment status transition")
    void rejectsIllegalStatusChange() {
        Appointment appointment = Appointment.builder()
                .id(5L).status(AppointmentStatus.COMPLETED).build();
        when(appointmentRepository.findById(5L)).thenReturn(Optional.of(appointment));

        assertThatThrownBy(() ->
                appointmentService.changeStatus(5L, AppointmentStatus.IN_PROGRESS))
                .isInstanceOf(com.dms.service.exception.IllegalStateTransitionException.class);
    }
}
