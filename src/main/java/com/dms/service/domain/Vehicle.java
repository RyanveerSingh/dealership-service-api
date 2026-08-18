package com.dms.service.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "vehicles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vin", nullable = false, length = 17, unique = true)
    private String vin;

    @Column(name = "make", nullable = false, length = 60)
    private String make;

    @Column(name = "model", nullable = false, length = 60)
    private String model;

    /** SMALLINT in the schema, so Short — Integer would fail ddl-auto validation. */
    @Column(name = "model_year", nullable = false)
    private Short modelYear;

    @Column(name = "mileage", nullable = false)
    private Integer mileage;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;
}
