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

# MaxRAMPercentage rather than a fixed -Xmx: the JVM then sizes the heap from
# whatever memory limit the container is actually given, so the same image
# behaves correctly on a 512 MB task and on a 4 GB one.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+UseContainerSupport"

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
