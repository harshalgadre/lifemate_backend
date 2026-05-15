# ============================================================
# Stage 1: Install dependencies
# ============================================================
# Use the official Node.js 20 image built on Alpine Linux.
# Alpine is a minimal Linux distro (~5 MB) which keeps the
# final Docker image small compared to Debian-based images.
FROM node:20-alpine AS deps

# Set the working directory inside the container.
# All subsequent commands (COPY, RUN, CMD) will run from here.
WORKDIR /app

# Copy ONLY the package files first.
# Docker caches each layer — if package.json hasn't changed,
# Docker reuses the cached "npm ci" layer and skips reinstall.
# This makes rebuilds much faster when only code changes.
COPY package.json package-lock.json ./

# Install dependencies using "npm ci" (Clean Install).
# Unlike "npm install", ci:
#   - Requires package-lock.json (deterministic installs)
#   - Deletes existing node_modules first
#   - Never writes to package.json
#   - Faster and more reliable for CI/CD & Docker builds
# "--omit=dev" skips devDependencies (nodemon, @types/node)
# since we don't need them in production.
RUN npm ci --omit=dev

# ============================================================
# Stage 2: Production image
# ============================================================
# Start a fresh Alpine image so we don't carry build artifacts
# or caches from the deps stage. This is called "multi-stage
# build" — it keeps the final image as small as possible.
FROM node:20-alpine AS production

# Set NODE_ENV to "production".
# Many npm packages behave differently in production mode:
#   - Express disables verbose error pages
#   - morgan logging can be conditionally applied
#   - Some packages enable optimizations
ENV NODE_ENV=production

# Set working directory in the production image
WORKDIR /app

# Copy the installed node_modules from the "deps" stage.
# This is the key benefit of multi-stage builds — we get
# clean production dependencies without build caches.
COPY --from=deps /app/node_modules ./node_modules

# Copy the application source code into the container.
# The "." means "everything in the build context" (your
# project root), but .dockerignore excludes files we
# don't want (node_modules, .env, .git, etc.)
COPY . .

# Tell Docker that this container will listen on port 5000.
# This is documentation only — it doesn't actually publish
# the port. You still need -p 5000:5000 when running.
EXPOSE 5000

# Healthcheck: Docker will periodically run this command to
# check if the container is healthy. If /health returns a
# non-200 status 3 times in a row, Docker marks it unhealthy.
#   --interval=30s   → check every 30 seconds
#   --timeout=10s    → wait up to 10 seconds for response
#   --start-period=40s → give the app 40 seconds to start up
#   --retries=3      → mark unhealthy after 3 consecutive failures
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Create a non-root user for security.
# By default, containers run as root — if an attacker exploits
# the app, they'd have root access inside the container.
# Running as a non-root user limits the damage.
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

# Switch to the non-root user for all subsequent commands
USER nodeuser

# The command to run when the container starts.
# CMD uses the exec form ["..."] which doesn't start a shell,
# so Node.js receives signals (SIGTERM, SIGINT) directly —
# enabling graceful shutdown.
CMD ["node", "server.js"]
