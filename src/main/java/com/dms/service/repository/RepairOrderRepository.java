package com.dms.service.repository;

import com.dms.service.domain.RepairOrder;
import com.dms.service.domain.RepairOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RepairOrderRepository extends JpaRepository<RepairOrder, Long> {

    /** At most one RO per appointment — see uq_ro_appointment. */
    Optional<RepairOrder> findByAppointmentId(Long appointmentId);

    boolean existsByAppointmentId(Long appointmentId);

    List<RepairOrder> findByStatus(RepairOrderStatus status);

    List<RepairOrder> findByTechnicianId(Long technicianId);

    /**
     * Loads an RO with its lines in a single query. Without the fetch join,
     * pricing an RO with N lines costs N+1 selects.
     */
    @Query("""
           select distinct ro from RepairOrder ro
             left join fetch ro.lineItems li
             left join fetch li.part
           where ro.id = :id
           """)
    Optional<RepairOrder> findByIdWithLineItems(@Param("id") Long id);
}
