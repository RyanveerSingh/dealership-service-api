package com.dms.service.web.dto;

import com.dms.service.domain.Customer;
import com.dms.service.domain.Part;
import com.dms.service.domain.ServiceBay;
import com.dms.service.domain.Vehicle;

import java.math.BigDecimal;

/**
 * Read-only projections the UI needs to populate its selectors.
 *
 * Grouped in one file because they are small, purely structural, and always
 * change together; splitting four three-line records across four files would be
 * ceremony rather than organisation.
 */
public final class CatalogDtos {

    private CatalogDtos() {
    }

    public record BayResponse(Long id, String name, boolean active) {
        public static BayResponse from(ServiceBay b) {
            return new BayResponse(b.getId(), b.getName(), b.isActive());
        }
    }

    public record PartResponse(
            Long id,
            String sku,
            String name,
            BigDecimal unitPrice,
            Integer stockQuantity,
            Integer reorderLevel,
            boolean belowReorderLevel
    ) {
        public static PartResponse from(Part p) {
            return new PartResponse(p.getId(), p.getSku(), p.getName(), p.getUnitPrice(),
                    p.getStockQuantity(), p.getReorderLevel(), p.isBelowReorderLevel());
        }
    }

    public record VehicleResponse(
            Long id,
            String vin,
            String make,
            String model,
            Short modelYear,
            Integer mileage,
            Long customerId,
            String customerName
    ) {
        /** Requires the customer association to be loaded. */
        public static VehicleResponse from(Vehicle v) {
            Customer c = v.getCustomer();
            return new VehicleResponse(v.getId(), v.getVin(), v.getMake(), v.getModel(),
                    v.getModelYear(), v.getMileage(), c.getId(),
                    c.getFirstName() + " " + c.getLastName());
        }
    }

    public record CustomerResponse(Long id, String fullName, String email, String phone) {
        public static CustomerResponse from(Customer c) {
            return new CustomerResponse(c.getId(),
                    c.getFirstName() + " " + c.getLastName(), c.getEmail(), c.getPhone());
        }
    }
}
