# Dealership Service Management API

A service-lane backend for a car dealership: customers bring vehicles in, an
advisor books a bay, a technician opens a repair order, parts come off the shelf,
and the order is priced and closed.

The interesting part is not the CRUD. It is that **two different concurrency
problems appear in the same application and need two different solutions**, and
that the schema — not just the application — refuses to hold invalid data.

---

## Stack

| | |
|---|---|
| Java | 17 (Temurin) |
| Spring Boot | 3.5.3 |
| Database | MySQL 8.4 in Docker, port **3307** |
| Migrations | Flyway (`ddl-auto: validate` — Hibernate never writes DDL) |
| Security | Spring Security 6 + JWT (jjwt 0.12.6), 4 roles |
| Docs | springdoc-openapi 2.8.6 → `/swagger-ui.html` |
| Frontend | React 19 + TypeScript, built with Vite |
| Tests | JUnit 5, Mockito, AssertJ — 43 tests |

The React bundle is compiled in a Node stage of the Dockerfile and copied into
the jar's static resources, so the whole application ships as **one artifact on
one origin**. That keeps it inside Railway's single-service free tier and means
there is no CORS configuration to get wrong.

---

## Running it

**Local development** — MySQL in Docker, backend from Maven, UI from Vite:

```bash
docker compose up -d          # MySQL on :3307, wait for "healthy"
./mvnw spring-boot:run        # Flyway builds the schema on first boot

cd frontend && npm install && npm run dev    # UI on :5173
```

Open **http://localhost:5173**. Vite proxies `/api` to port 8080, so the browser
sees a single origin in development exactly as it does in production, and no
CORS configuration is needed anywhere.

To run the UI from Spring Boot instead of the Vite dev server, build it once:

```bash
cd frontend && npm run build
cp -r dist/* ../src/main/resources/static/     # then restart the app
```

**Everything in containers** — app image plus MySQL:

```bash
docker compose --profile full up -d --build
```

The `full` profile is opt-in so the plain `docker compose up -d` above still
starts only the database, which is what you want when running the app from an
IDE debugger.

```bash
curl http://localhost:8080/actuator/health      # {"status":"UP"}
```

Dev logins (all `password123`):

| Email | Role |
|---|---|
| `admin@dms.local` | ADMIN |
| `advisor@dms.local` | SERVICE_ADVISOR |
| `tech@dms.local` | TECHNICIAN |

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"advisor@dms.local","password":"password123"}'
```

Then send `Authorization: Bearer <accessToken>` on everything else.

---

## The interface

Three screens, each built to make a backend guarantee visible rather than to
hide it:

**Bookings** — book a bay, and try to book an overlapping slot. The 409 comes
back as *"Bay 1 is already booked between …"*, rendered from the server's own
error message. Booking a slot that starts exactly when another ends is accepted,
which is the half-open interval working. The booking form is hidden entirely for
a Technician, mirroring the `@PreAuthorize` rule — though the server still
rejects the call regardless of what the UI chooses to show.

**Repair Orders** — add a part and watch stock fall in the same action. Ask for
more than exists and the UI reports the conflict, then re-reads inventory to show
it is unchanged: the rollback, visible. The status buttons are rendered from
`allowedNextStatuses` on the response, so the UI never offers a transition the
state machine would reject. The rules live in one place, on the server.

**Inventory** — stock levels with reorder warnings, and stock receipt that adds
to the current quantity rather than overwriting it.

Times are formatted by parsing the `LocalDateTime` string directly rather than
via `new Date()`, which would apply the browser's timezone offset and reintroduce
the shift the backend was fixed to avoid.

---

## Configuration

Nothing environment-specific is hard-coded. Every value below defaults to the
local Compose setup, so a fresh clone runs with no environment at all.

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `8080` | Injected by Railway/Render; do not set manually |
| `DB_URL` | `jdbc:mysql://localhost:3307/dms?...` | Use `mysql:3306` inside Compose |
| `DB_USERNAME` | `dms` | |
| `DB_PASSWORD` | `dmspass` | |
| `DB_POOL_SIZE` | `10` | Hikari max pool |
| `JWT_SECRET` | dev value | **Must be overridden when deployed** |
| `JWT_TTL_MINUTES` | `60` | Access-token lifetime |
| `TAX_RATE` | `0.18` | |
| `LOG_SQL_LEVEL` | `INFO` | `DEBUG` prints every statement |

The committed `JWT_SECRET` default decodes to the literal string
`fake-dev-secret-change-me-before-deploy-256`. It is in the repo on purpose so a
clone runs immediately, and it protects nothing. Generate a real one with:

```bash
openssl rand -base64 48
```

`Keys.hmacShaKeyFor` rejects anything under 256 bits, so a too-short secret fails
at startup rather than quietly issuing forgeable tokens.

Only the `health` actuator endpoint is exposed. `env` and `configprops` would
print the datasource password and the JWT secret to anyone who asked.

---

## Deployment

[`DEPLOY.md`](DEPLOY.md) walks through hosting this for free, with no credit
card: the app on Railway, MySQL on Aiven's always-free tier.

The database is kept off Railway on purpose. Railway's permanent free plan
allows $1/month of usage and one small always-on service costs about that, so
running MySQL there as well would roughly double the bill and the deployment
would stop once the 30-day trial credit expired.

---

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push and PR:

1. **Build and test** against a real MySQL 8.4 service container. The
   `@SpringBootTest` case boots the whole application, so Flyway runs and
   `ddl-auto: validate` checks every entity against the real schema — CI fails if
   a migration and an entity ever drift apart. Mocking the database away would
   lose exactly that signal.
2. **Docker image build**, then a smoke test that starts the image against MySQL,
   waits for `/actuator/health`, and performs a real login. That proves the
   container serves traffic, not merely that it boots.

---

## The two concurrency mechanisms

This is the part worth understanding, and the reason both exist.

### Service bays — pessimistic (`SELECT ... FOR UPDATE`)

Booking runs three steps **in this order**, inside one transaction
([`AppointmentService#book`](src/main/java/com/dms/service/service/AppointmentService.java)):

1. `SELECT ... FOR UPDATE` on the bay row
2. range-overlap query against `appointments`
3. `INSERT` the appointment

Step 1 must come first. Two advisors booking the same bay both reach step 1, but
only one holds the lock; the loser blocks until the winner commits and then sees
the winner's row in its own step 2. Reverse steps 1 and 2 and both read "free"
before either inserts — classic write-skew, two cars in one bay.

**`@Version` cannot solve this.** Optimistic locking detects concurrent edits to
a row you already read. Here nobody edits the bay at all; the hazard is an
appointment row that *did not exist* when you looked. That is a phantom, and
serialising on the parent row is what removes it.

There is also no fallback: **MySQL cannot express "no overlapping ranges" as a
constraint**, so unlike stock levels, the database cannot catch this if the
application gets it wrong. The lock is doing real work.

The call ordering is pinned by a test
([`AppointmentServiceTest#locksBayBeforeCheckingOverlap`](src/test/java/com/dms/service/service/AppointmentServiceTest.java)),
so a refactor that reorders those lines fails the build instead of silently
reintroducing the race.

### Parts inventory — optimistic (`@Version`)

Two advisors consuming the same SKU at the same instant is *rare*, so locking
every inventory read would cost more than it saves. `parts.version` is checked on
write; the loser gets `OptimisticLockingFailureException` and `@Retryable`
re-runs the whole method — outside the transaction, so each attempt re-reads the
row.

Adding a part line also draws stock down **in the same transaction as the line
insert**. If stock is short, the exception rolls both back, so inventory is never
reduced for a line that was never recorded.

> **The one-sentence answer:** pessimistic where conflict is likely and the check
> is a range query vulnerable to phantoms; optimistic where conflict is rare and
> the check is a single row.

---

## Constraints live in the database

`ddl-auto: validate` means Hibernate checks the entities against the schema and
refuses to start if they disagree — it never creates or alters anything. The
schema is versioned SQL in git.

Rules the database enforces regardless of application bugs:

- `ck_li_partref` — a `PART` line must reference a part; a `LABOR` line must not
- `ck_parts_stock` — stock can never go negative
- `ck_appt_window` — an appointment must end after it starts
- `uq_ro_appointment` — at most one repair order per appointment

---

## State machines

Both `AppointmentStatus` and `RepairOrderStatus` carry their own legal edges, so
the rules live in one readable place rather than scattered across service
methods. Illegal transitions are rejected with **409**, never silently applied.

```
Appointment:  SCHEDULED → CHECKED_IN → IN_PROGRESS → COMPLETED
              (any live state) → CANCELLED

RepairOrder:  OPEN → AWAITING_PARTS / IN_PROGRESS
              IN_PROGRESS → AWAITING_APPROVAL / CLOSED
              (any live state) → VOIDED
              CLOSED and VOIDED are terminal
```

`GET /api/repair-orders/{id}` publishes `allowedNextStatuses`, so a UI can grey
out buttons instead of discovering the rule via a 409.

---

## API

| Method | Path | Role |
|---|---|---|
| POST | `/api/auth/login` | public |
| GET | `/api/auth/me` | any |
| POST | `/api/appointments` | ADVISOR, ADMIN |
| PUT | `/api/appointments/{id}/schedule` | ADVISOR, ADMIN |
| PATCH | `/api/appointments/{id}/status` | ADVISOR, ADMIN, TECH |
| POST | `/api/repair-orders` | ADVISOR, ADMIN |
| POST | `/api/repair-orders/{id}/line-items` | ADVISOR, ADMIN, TECH |
| DELETE | `/api/repair-orders/{id}/line-items/{lineId}` | ADVISOR, ADMIN |
| PATCH | `/api/repair-orders/{id}/status` | ADVISOR, ADMIN, TECH |

Every error — including the 401/403 produced by security filters, which never
reach `@RestControllerAdvice` — uses one JSON shape:

```json
{
  "timestamp": "2026-08-18T04:18:42Z",
  "status": 409,
  "error": "Insufficient Stock",
  "message": "Insufficient stock for BRK-PAD-FRT: requested 5, available 2",
  "path": "/api/repair-orders/1/line-items"
}
```

---

## Tests

```bash
./mvnw test        # 43 tests
```

Notable ones: the lock-ordering test above; the rollback test proving stock is
unchanged after an insufficient-stock failure; and a test that a client-supplied
`unitPrice` on a `PART` line is ignored in favour of the inventory price, so a
caller cannot invoice itself brake pads at one rupee.

---

## Notes on the build

Three things differ from the original day-one plan, each forced by reality rather
than preference:

- **Java 17, not 21.** Boot 3.5 requires 17+; nothing in the design depends on 21.
- **Boot 3.5.3, not 3.4.2.** Spring Initializr has retired every 3.x release and
  now offers only Boot 4.x, which is Spring Framework 7 + Security 7 with
  breaking configuration changes. 3.5.3 is the newest 3.x and keeps springdoc 2.x
  and Security 6 working as designed.
- **`V3__fix_seed_password_hashes.sql`.** The hash shipped in `V2` was labelled
  BCrypt for `password123` but does not verify against it, so every seeded account
  returned 401. Fixed forward rather than by editing `V2`, because Flyway
  checksums applied migrations and an in-place edit breaks validation on any
  database that already ran it.

### The timezone trap

`DealershipServiceApiApplication` pins the JVM to UTC in a static block. This is
not decoration — it fixes a real bug found by reading the SQL MySQL actually
received.

`scheduled_start` is `DATETIME`: wall-clock time at the dealership, no zone. But
the JDBC driver converts `LocalDateTime` between the JVM zone and the connection
zone, so on an IST machine a **14:00 booking was written to the column as 08:30**.
It read back as 14:00, so the API looked correct and every test passed — while the
stored row said something else entirely. Any report, BI query, or second consumer
reading that table would have got the wrong answer.

The shift was the JVM's offset, so the same request on a UTC server would have
stored 14:00 instead: the meaning of a row depended on which machine wrote it.
That is the kind of thing that silently corrupts data after a deploy to a
UTC-based EC2 host.

Pinning the JVM to UTC makes JVM zone, connection zone, and the MySQL container
all agree, so `LocalDateTime` passes through untouched while `Instant`-mapped
`TIMESTAMP` columns stay in true UTC. Verified both ways: `scheduled_start` stores
`14:00:00`, and `created_at` matches `UTC_TIMESTAMP()`.

Setting it in code rather than via `-Duser.timezone` means it holds however the
app is launched — `mvn spring-boot:run`, `java -jar`, or a container with no `TZ`.
