package com.dms.service.domain;

/**
 * Mirrors ck_users_role in V1__init.sql. Spring Security authorities are
 * derived as "ROLE_" + name(), so ADMIN becomes ROLE_ADMIN.
 */
public enum Role {
    ADMIN,
    SERVICE_ADVISOR,
    TECHNICIAN,
    CUSTOMER
}
