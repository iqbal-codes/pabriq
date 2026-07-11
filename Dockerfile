# Stage 1: Build the application
FROM oven/bun:1.3.10-alpine AS builder
WORKDIR /app

# Copy lockfile and package.json to leverage Docker cache
COPY package.json bun.lock ./

# Install all dependencies (including devDependencies needed for build)
RUN bun install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the TanStack Start app
RUN bun run build

# Stage 2: Install production dependencies only
FROM oven/bun:1.3.10-alpine AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Stage 3: Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Add non-root user
RUN addgroup -S pabriq && adduser -S pabriq -G pabriq

# Copy built application and production dependencies
COPY --chown=pabriq:pabriq --from=builder /app/package.json ./package.json
COPY --chown=pabriq:pabriq --from=prod-deps /app/node_modules ./node_modules
COPY --chown=pabriq:pabriq --from=builder /app/dist ./dist
COPY --chown=pabriq:pabriq --from=builder /app/scripts/start-production.mjs ./scripts/start-production.mjs
COPY --chown=pabriq:pabriq --from=builder /app/drizzle ./drizzle

# Expose the default port for TanStack Start (usually 3001)
EXPOSE 3001
ENV PORT=3001
ENV HOST=0.0.0.0

USER pabriq

STOPSIGNAL SIGTERM

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || '3001') + '/api/ready').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "run", "start:prod"]
