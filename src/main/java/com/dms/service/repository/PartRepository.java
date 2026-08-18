package com.dms.service.repository;

import com.dms.service.domain.Part;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

/**
 * Note the absence of a FOR UPDATE finder here, unlike ServiceBayRepository.
 * Parts are guarded by @Version (optimistic); adding a row lock would serialise
 * every inventory read for a conflict that is rare in practice.
 */
public interface PartRepository extends JpaRepository<Part, Long> {

    Optional<Part> findBySku(String sku);

    boolean existsBySku(String sku);

    /** Parts at or below their reorder threshold — drives the low-stock report. */
    @Query("select p from Part p where p.stockQuantity <= p.reorderLevel order by p.sku")
    List<Part> findBelowReorderLevel();
}
