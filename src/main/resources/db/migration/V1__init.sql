-- ============================================================
-- V1__init.sql  |  Dealership Service Management API
-- Flyway baseline schema.
-- ============================================================

CREATE TABLE users (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(160) NOT NULL,
    password_hash   VARCHAR(100) NOT NULL,
    full_name       VARCHAR(120) NOT NULL,
    role            VARCHAR(20)  NOT NULL,
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version         BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT ck_users_role  CHECK (role IN
        ('ADMIN','SERVICE_ADVISOR','TECHNICIAN','CUSTOMER'))
);

CREATE TABLE customers (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    first_name   VARCHAR(80)  NOT NULL,
    last_name    VARCHAR(80)  NOT NULL,
    email        VARCHAR(160) NOT NULL,
    phone        VARCHAR(20)  NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_customers_email UNIQUE (email)
);

CREATE TABLE vehicles (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    vin          VARCHAR(17)  NOT NULL,
    make         VARCHAR(60)  NOT NULL,
    model        VARCHAR(60)  NOT NULL,
    model_year   SMALLINT     NOT NULL,
    mileage      INT          NOT NULL DEFAULT 0,
    customer_id  BIGINT       NOT NULL,
    CONSTRAINT uq_vehicles_vin  UNIQUE (vin),
    CONSTRAINT fk_vehicles_cust FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT ck_vehicles_year CHECK (model_year BETWEEN 1900 AND 2100)
);
CREATE INDEX idx_vehicles_customer ON vehicles (customer_id);

-- A physical service bay. Bookings contend on this row.
CREATE TABLE service_bays (
    id      BIGINT AUTO_INCREMENT PRIMARY KEY,
    name    VARCHAR(40) NOT NULL,
    active  BOOLEAN     NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_bays_name UNIQUE (name)
);

CREATE TABLE parts (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    sku             VARCHAR(40)    NOT NULL,
    name            VARCHAR(140)   NOT NULL,
    unit_price      DECIMAL(10,2)  NOT NULL,
    stock_quantity  INT            NOT NULL DEFAULT 0,
    reorder_level   INT            NOT NULL DEFAULT 5,
    version         BIGINT         NOT NULL DEFAULT 0,   -- optimistic lock
    CONSTRAINT uq_parts_sku    UNIQUE (sku),
    CONSTRAINT ck_parts_stock  CHECK (stock_quantity >= 0),
    CONSTRAINT ck_parts_price  CHECK (unit_price >= 0)
);

CREATE TABLE appointments (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id       BIGINT     NOT NULL,
    bay_id           BIGINT     NOT NULL,
    advisor_id       BIGINT     NOT NULL,
    scheduled_start  DATETIME   NOT NULL,
    scheduled_end    DATETIME   NOT NULL,
    status           VARCHAR(20) NOT NULL,
    notes            VARCHAR(500),
    created_at       TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version          BIGINT     NOT NULL DEFAULT 0,
    CONSTRAINT fk_appt_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    CONSTRAINT fk_appt_bay     FOREIGN KEY (bay_id)     REFERENCES service_bays(id),
    CONSTRAINT fk_appt_advisor FOREIGN KEY (advisor_id) REFERENCES users(id),
    CONSTRAINT ck_appt_status  CHECK (status IN
        ('SCHEDULED','CHECKED_IN','IN_PROGRESS','COMPLETED','CANCELLED')),
    CONSTRAINT ck_appt_window  CHECK (scheduled_end > scheduled_start)
);
-- Drives the overlap query that guards double-booking.
CREATE INDEX idx_appt_bay_window ON appointments (bay_id, scheduled_start, scheduled_end);
CREATE INDEX idx_appt_status     ON appointments (status);

CREATE TABLE repair_orders (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    appointment_id BIGINT        NOT NULL,
    technician_id  BIGINT,
    status         VARCHAR(20)   NOT NULL,
    opened_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at      TIMESTAMP     NULL,
    parts_total    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    labor_total    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_total      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    grand_total    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    version        BIGINT        NOT NULL DEFAULT 0,
    CONSTRAINT uq_ro_appointment UNIQUE (appointment_id),
    CONSTRAINT fk_ro_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    CONSTRAINT fk_ro_technician  FOREIGN KEY (technician_id)  REFERENCES users(id),
    CONSTRAINT ck_ro_status      CHECK (status IN
        ('OPEN','AWAITING_PARTS','IN_PROGRESS','AWAITING_APPROVAL','CLOSED','VOIDED'))
);
CREATE INDEX idx_ro_status ON repair_orders (status);

CREATE TABLE ro_line_items (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    repair_order_id  BIGINT        NOT NULL,
    line_type        VARCHAR(10)   NOT NULL,
    part_id          BIGINT        NULL,
    description      VARCHAR(200)  NOT NULL,
    quantity         INT           NOT NULL,
    unit_price       DECIMAL(10,2) NOT NULL,
    line_total       DECIMAL(12,2) NOT NULL,
    CONSTRAINT fk_li_ro     FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_li_part   FOREIGN KEY (part_id) REFERENCES parts(id),
    CONSTRAINT ck_li_type   CHECK (line_type IN ('PART','LABOR')),
    CONSTRAINT ck_li_qty    CHECK (quantity > 0),
    -- a PART line must reference a part; a LABOR line must not
    CONSTRAINT ck_li_partref CHECK (
        (line_type = 'PART'  AND part_id IS NOT NULL) OR
        (line_type = 'LABOR' AND part_id IS NULL)
    )
);
CREATE INDEX idx_li_ro ON ro_line_items (repair_order_id);
