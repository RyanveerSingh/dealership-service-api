package com.dms.service.exception;

/** Maps to 404. */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public static ResourceNotFoundException of(String type, Object id) {
        return new ResourceNotFoundException(type + " " + id + " not found");
    }
}
