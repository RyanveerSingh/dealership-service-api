# Deploying free: Aiven (MySQL) + Railway (app)

Total cost: **zero**, no credit card at either provider.

The database deliberately lives outside Railway. Railway's permanent free plan
grants **$1/month** of usage, and one small always-on service costs roughly
$0.80–1.00/month. Running MySQL there too would be about $2/month, which the
free credit cannot cover — so the deployment would die when the 30-day trial
credit ran out. Keeping MySQL on Aiven's always-free tier means Railway runs a
single service and the demo keeps working indefinitely.

---

## 1. Database — Aiven (about 5 minutes)

1. Sign up at **https://aiven.io** (GitHub or Google login; no card requested).
2. **Create service** → **MySQL**.
3. Pick the **Free** plan. Choose the region closest to you — every query pays
   the round trip, so a distant region makes the API feel sluggish.
4. Name it `dms-mysql` and create. It takes 2–3 minutes to reach *Running*.
5. Open the service's **Overview** tab and copy these five values:

   | Field | Looks like |
   |---|---|
   | Host | `dms-mysql-xxxx.a.aivencloud.com` |
   | Port | `12345` (Aiven does **not** use 3306) |
   | User | `avnadmin` |
   | Password | (long random string) |
   | Database | `defaultdb` |

Now build the JDBC URL, substituting your host and port:

```
jdbc:mysql://YOUR_HOST:YOUR_PORT/defaultdb?sslMode=REQUIRED&connectionTimeZone=UTC
```

Three parts of that URL matter:

- **`sslMode=REQUIRED`** — Aiven refuses plaintext connections. The local
  default uses `useSSL=false`, which is fine against a container on your own
  machine but will simply be rejected here.
- **`connectionTimeZone=UTC`** — keeps `LocalDateTime` from being shifted on the
  way into the `DATETIME` columns. See the timezone section in the README; the
  app also pins its own JVM to UTC.
- **`defaultdb`** — Aiven's pre-created database name. Flyway will build all
  eight tables inside it on first boot.

---

## 2. App — Railway (about 5 minutes)

1. Sign up at **https://railway.com** with **GitHub**. Take the free trial
   ($5 / 30 days, no card). After it lapses your account drops to the free plan,
   which still covers this one service.
2. **New Project** → **Deploy from GitHub repo** → pick
   `RyanveerSingh/dealership-service-api`.
3. Railway reads [`railway.json`](railway.json) and builds from the
   [`Dockerfile`](Dockerfile). No buildpack guessing, no extra configuration.
4. Open **Variables** and add these four:

   | Variable | Value |
   |---|---|
   | `DB_URL` | the JDBC URL from step 1 |
   | `DB_USERNAME` | `avnadmin` |
   | `DB_PASSWORD` | your Aiven password |
   | `JWT_SECRET` | generate one — see below |

   Do **not** set `PORT`. Railway injects it, and the app reads `${PORT:8080}`.

   Generate a real secret (PowerShell, since you are on Windows):

   ```powershell
   $b = New-Object byte[] 48
   [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
   [Convert]::ToBase64String($b)
   ```

   The committed default is a throwaway that decodes to
   `fake-dev-secret-change-me-before-deploy-256`. Anyone reading the public repo
   could mint valid admin tokens with it, so this variable is not optional.

5. **Settings** → **Networking** → **Generate Domain**. You get a URL like
   `dealership-service-api-production.up.railway.app`.

---

## 3. Verify

```bash
curl https://YOUR-APP.up.railway.app/actuator/health
# {"status":"UP"}

curl -X POST https://YOUR-APP.up.railway.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"advisor@dms.local","password":"password123"}'
```

Swagger UI is at `https://YOUR-APP.up.railway.app/swagger-ui.html` — that is the
link worth putting on a CV, since it lets a reader exercise the API without
installing anything.

On the first boot the logs should show Flyway applying migrations 1, 2 and 3.

---

## If something goes wrong

**Health check timeout / deploy marked unhealthy.** Almost always the database.
The app runs `ddl-auto: validate` and will refuse to start if it cannot reach
MySQL or if the schema does not match. Check the deploy logs for
`Communications link failure`, and confirm `sslMode=REQUIRED` is in `DB_URL`.

**`Public Key Retrieval is not allowed`.** You copied the local URL, which uses
`useSSL=false`. Aiven needs `sslMode=REQUIRED` instead.

**`OutOfMemoryError` or the container restarting.** Railway's free plan gives
512 MB. The image already sets `-XX:MaxRAMPercentage=75.0`, so the heap sizes
itself to the limit, but if it is still tight add a `JAVA_OPTS` variable:

```
-XX:MaxRAMPercentage=70.0 -Xss512k -XX:+UseSerialGC
```

`UseSerialGC` matters more than it looks — G1 reserves extra native memory that
is wasted on a single small container.

**Trial expired and the service stopped.** Confirm only one service exists in
the Railway project. If a database service was created there too, delete it —
two services exceed the $1/month free credit.

---

## Redeploying

Railway watches `main`, so `git push` redeploys. CI runs the tests in parallel;
note that Railway does not wait for CI to pass before deploying, so check the
Actions tab if a deploy behaves unexpectedly.

Because the image uses Spring Boot's layered jars, a code-only change rebuilds
and re-pushes roughly 446 kB rather than the full 68 MB.
