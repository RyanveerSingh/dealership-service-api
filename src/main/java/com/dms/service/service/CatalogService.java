package com.dms.service.service;

import com.dms.service.domain.Part;
import com.dms.service.exception.ResourceNotFoundException;
import com.dms.service.repository.CustomerRepository;
import com.dms.service.repository.PartRepository;
import com.dms.service.repository.ServiceBayRepository;
import com.dms.service.repository.VehicleRepository;
import com.dms.service.web.dto.CatalogDtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Read-side lookups that the UI needs to populate selectors, plus the one
 * inventory write that is not part of a repair order.
 */
@Service
public class CatalogService {

    private final ServiceBayRepository bayRepository;
    private final PartRepository partRepository;
    private final VehicleRepository vehicleRepository;
    private final CustomerRepository customerRepository;

    public CatalogService(ServiceBayRepository bayRepository,
                          PartRepository partRepository,
                          VehicleRepository vehicleRepository,
                          CustomerRepository customerRepository) {
        this.bayRepository = bayRepository;
        this.partRepository = partRepository;
        this.vehicleRepository = vehicleRepository;
        this.customerRepository = customerRepository;
    }

    @Transactional(readOnly = true)
    public List<BayResponse> bays() {
        return bayRepository.findAll().stream().map(BayResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<PartResponse> parts() {
        return partRepository.findAll().stream()
                .sorted((a, b) -> a.getSku().compareTo(b.getSku()))
                .map(PartResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PartResponse> lowStockParts() {
        return partRepository.findBelowReorderLevel().stream().map(PartResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> vehicles() {
        return vehicleRepository.findAllWithCustomer().stream().map(VehicleResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<CustomerResponse> customers() {
        return customerRepository.findAll().stream().map(CustomerResponse::from).toList();
    }

    /**
     * Receives stock for a part.
     *
     * Adds to the current quantity rather than setting an absolute value: a
     * delivery of 20 units is a fact about the delivery, whereas "set stock to
     * 20" silently discards anything consumed since the caller last read the
     * row. The @Version column still guards against two concurrent receipts
     * overwriting one another.
     */
    @Transactional
    public PartResponse receiveStock(Long partId, int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("quantity must be greater than zero");
        }
        Part part = partRepository.findById(partId)
                .orElseThrow(() -> ResourceNotFoundException.of("Part", partId));

        part.setStockQuantity(part.getStockQuantity() + quantity);
        return PartResponse.from(part);
    }
}
