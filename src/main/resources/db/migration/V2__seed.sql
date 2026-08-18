-- Dev seed data. Passwords below are BCrypt for "password123".
INSERT INTO users (email, password_hash, full_name, role) VALUES
 ('admin@dms.local',    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Ops Admin',      'ADMIN'),
 ('advisor@dms.local',  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Priya Advisor',  'SERVICE_ADVISOR'),
 ('tech@dms.local',     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Ravi Technician','TECHNICIAN');

INSERT INTO service_bays (name) VALUES ('Bay 1'), ('Bay 2'), ('Bay 3');

INSERT INTO customers (first_name, last_name, email, phone) VALUES
 ('Aarav','Sharma','aarav@example.com','+919000000001'),
 ('Neha','Kapoor','neha@example.com','+919000000002');

INSERT INTO vehicles (vin, make, model, model_year, mileage, customer_id) VALUES
 ('1HGCM82633A004352','Honda','City',   2021, 42000, 1),
 ('5YJ3E1EA7JF000316','Hyundai','Creta',2023, 18000, 2);

INSERT INTO parts (sku, name, unit_price, stock_quantity, reorder_level) VALUES
 ('OIL-5W30-1L','Engine Oil 5W-30 (1L)',  650.00, 40, 10),
 ('FLT-OIL-STD','Oil Filter (Standard)',  420.00, 12,  5),
 ('BRK-PAD-FRT','Brake Pad Set (Front)', 3200.00,  4,  2),
 ('WPR-BLD-22', 'Wiper Blade 22in',       550.00, 25,  8);
