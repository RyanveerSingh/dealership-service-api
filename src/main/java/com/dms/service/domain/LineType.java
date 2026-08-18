package com.dms.service.domain;

/**
 * Mirrors ck_li_type in V1__init.sql. The database additionally enforces
 * (ck_li_partref) that a PART line carries a part_id and a LABOR line does not.
 */
public enum LineType {
    PART,
    LABOR
}
