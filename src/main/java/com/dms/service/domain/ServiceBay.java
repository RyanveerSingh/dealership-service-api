package com.dms.service.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A physical service bay.
 *
 * This row is the pessimistic-lock target when booking. The booking transaction
 * takes SELECT ... FOR UPDATE on the bay, then runs the overlap query, so two
 * concurrent bookings for the same bay serialise instead of both seeing a free
 * slot. See ServiceBayRepository#findByIdForUpdate.
 */
@Entity
@Table(name = "service_bays")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceBay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 40, unique = true)
    private String name;

    @Builder.Default
    @Column(name = "active", nullable = false)
    private boolean active = true;
}
