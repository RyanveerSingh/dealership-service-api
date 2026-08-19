# ============================================================
# Stage 1 - frontend
# ============================================================
FROM node:22-alpine AS frontend

WORKDIR /fe

# Same caching trick as the Maven stage below: lockfile first, so npm ci only
# re-runs when dependencies actually change rather than on every source edit.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ============================================================
# Stage 2 - backend build
# ============================================================
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /build

# Copy the POM alone first and resolve dependencies. Docker caches this layer on
# the POM's checksum, so editing Java source does not re-download the world -
# it turns a ~2 minute rebuild into a ~15 second one.
COPY pom.xml .
RUN mvn -B -ntp dependency:go-offline

COPY src ./src

# Drop the compiled bundle into Spring's static resources so it is packaged
# inside the jar and served from the same origin as the API. One deployable
# artifact, one URL, and therefore no CORS configuration to get wrong.
COPY --from=frontend /fe/dist ./src/main/resources/static

RUN mvn -B -ntp clean package -DskipTests

# Split the fat jar into Spring Boot's four layers, ordered by how often they
# change. Dependencies are ~60 MB and change only when the POM does; application
# classes are a few hundred KB and change on every commit. Copying them as
# separate layers below means a normal code change rebuilds and re-pushes only
# the small layer instead of all 66 MB.
RUN java -Djarmode=layertools -jar target/*.jar extract --destination extracted

# ============================================================
# Stage 2 - runtime
# ============================================================
# JRE, not JDK: the compiler is not needed at runtime and dropping it removes a
# large slice of the image and of the attack surface.
FROM eclipse-temurin:17-jre-alpine AS runtime

# Run as an unprivileged user. A container process running as root that escapes
# its namespace is root on the host.
RUN addgroup -S dms && adduser -S -G dms dms

WORKDIR /app

# --chown on COPY rather than a later `RUN chown -R`. A separate chown rewrites
# every file, and because layers are copy-on-write that duplicated the whole
# 68 MB jar into a second layer - the image was 515 MB with ~68 MB of pure
# duplication. Setting ownership during the copy costs nothing.
# Least-changing layer first so the cache survives ordinary code edits.
COPY --from=build --chown=dms:dms /build/extracted/dependencies/ ./
COPY --from=build --chown=dms:dms /build/extracted/spring-boot-loader/ ./
COPY --from=build --chown=dms:dms /build/extracted/snapshot-dependencies/ ./
COPY --from=build --chown=dms:dms /build/extracted/application/ ./

USER dms

EXPOSE 8080

# The JVM is pinned to UTC in code as well; this keeps the container's own
# clock consistent for log timestamps.
ENV TZ=UTC

# Tuned for a 512 MB container, which is what the free tiers give you.
#
# The heap is only part of what a JVM occupies. Metaspace, the code cache,
# thread stacks and the GC's own native structures all live outside it, and on
# Spring Boot they add up to roughly 150-200 MB. At MaxRAMPercentage=75 the heap
# alone took 384 MB of 512 MB, leaving nowhere near enough for the rest - so the
# kernel OOM-killed the container. Each flag below buys back a piece of that:
#
#   MaxRAMPercentage=50   256 MB heap, leaving real headroom for non-heap
#   UseSerialGC           G1 reserves tens of MB of native memory for region
#                         tables and remembered sets, which is wasted on one
#                         small container with low concurrency
#   MaxMetaspaceSize      caps class metadata instead of letting it grow until
#                         the container dies
#   ReservedCodeCacheSize this app JITs a small amount of code; 64 MB is ample
#   Xss512k               200 Tomcat threads at the 1 MB default stack is a lot
#                         of memory reserved for stacks that stay nearly empty
#   ExitOnOutOfMemoryError fail fast and let the platform restart cleanly,
#                         rather than limping on in a degraded state
# Absolute sizes, not percentages.
#
# MaxRAMPercentage only works if the JVM can read a container memory limit.
# Locally, `docker run --memory=512m` sets one and the JVM sized a 256 MB heap
# correctly. A platform that enforces its quota outside the container - killing
# the process when it exceeds the plan - may expose no such limit, and the JVM
# then sizes the heap from the HOST's RAM, which is tens of gigabytes. The heap
# grows happily until the platform kills it, which is why this passed a local
# 512 MB test and still died in production.
#
# Stating every number absolutely removes the detection step entirely, so the
# footprint is identical wherever it runs.
#
# The sizes below come from measurement, not estimation. A first attempt gave
# metaspace 96 MB and died with OutOfMemoryError: Metaspace after ~1200
# requests: Spring, Hibernate and Security generate CGLIB and entity proxies
# steadily, so class metadata keeps growing long after startup looks settled.
# Heap was never the constraint - total usage sat at 321 MB with 224 MB of heap
# available - so budget moves from heap to metaspace.
#
#   Xmx192m                heap; measured steady state is well under this
#   MaxMetaspaceSize 192m  class metadata, the thing that actually ran out
#   ReservedCodeCache 48m  JIT output
#   MaxDirectMemory 24m    NIO buffers, off-heap and otherwise unbounded
#   Xss512k x 40 threads   ~20 MB of stacks
#
# No HeapDumpOnOutOfMemoryError: it wrote a 75 MB dump into /tmp, which is
# memory-backed in this image, so the diagnostic made the exhaustion worse at
# precisely the wrong moment.
ENV JAVA_OPTS="-Xms96m -Xmx192m -XX:+UseSerialGC \
-XX:MaxMetaspaceSize=192m -XX:ReservedCodeCacheSize=48m -XX:MaxDirectMemorySize=24m \
-Xss512k -XX:+ExitOnOutOfMemoryError"

# Compose and orchestrators use this to decide when the app is ready to serve.
# Shell form, not exec form, so ${PORT} actually expands - PaaS platforms assign
# the port at runtime and a hard-coded 8080 would report unhealthy forever.
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD wget -qO- http://localhost:${PORT:-8080}/actuator/health | grep -q '"status":"UP"' || exit 1

# JarLauncher, not `java -jar`: the jar was expanded into layers above, so there
# is no fat jar left to run. Note the package is org.springframework.boot.loader
# .launch as of Boot 3.2 - the pre-3.2 path silently does not exist here.
#
# sh -c so $JAVA_OPTS expands, and `exec` so the JVM becomes PID 1 and receives
# SIGTERM directly - otherwise shutdown waits out the 10s kill timer instead of
# closing connections cleanly.
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS org.springframework.boot.loader.launch.JarLauncher"]
