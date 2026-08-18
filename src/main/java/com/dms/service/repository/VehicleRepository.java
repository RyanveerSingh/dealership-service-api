package com.dms.service.repository;

import com.dms.service.domain.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    Optional<Vehicle> findByVin(String vin);

    boolean existsByVin(String vin);

    List<Vehicle> findByCustomerId(Long customerId);

    /**
     * Fetch-joins the owner. The vehicle list renders the customer's name, and
     * customer is a LAZY @ManyToOne, so without this join listing N vehicles
     * costs N+1 queries.
     */
    @Query("select v from Vehicle v join fetch v.customer order by v.id")
    List<Vehicle> findAllWithCustomer();
}
