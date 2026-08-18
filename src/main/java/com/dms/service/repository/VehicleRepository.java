package com.dms.service.repository;

import com.dms.service.domain.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    Optional<Vehicle> findByVin(String vin);

    boolean existsByVin(String vin);

    List<Vehicle> findByCustomerId(Long customerId);
}
