package com.dms.service.exception;

/**
 * Maps to 409. Raised when a part line demands more units than inventory holds.
 * Throwing this rolls back the whole repair-order transaction, so no partial
 * draw-down survives.
 */
public class InsufficientStockException extends RuntimeException {

    public InsufficientStockException(String sku, int requested, int available) {
        super("Insufficient stock for " + sku + ": requested " + requested
              + ", available " + available);
    }
}
