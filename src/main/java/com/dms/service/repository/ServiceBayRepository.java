package com.dms.service.repository;

import com.dms.service.domain.ServiceBay;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ServiceBayRepository extends JpaRepository<ServiceBay, Long> {

    List<ServiceBay> findByActiveTrue();

    /**
     * Loads the bay under a row-level write lock: emits SELECT ... FOR UPDATE.
     *
     * This is the pessimistic half of the concurrency story. Booking must:
     *   1. take this lock,
     *   2. run the overlap query,
     *   3. insert,
     * all in one transaction. The lock is what makes steps 2 and 3 atomic with
     * respect to another booker.
     *
     * Optimistic locking cannot substitute here. A @Version check detects a
     * concurrent modification of a row you already read, but the hazard when
     * booking is a row that did not exist at read time — a phantom. Serialising
     * on the parent bay row is what removes it.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from ServiceBay b where b.id = :id")
    Optional<ServiceBay> findByIdForUpdate(@Param("id") Long id);
}
