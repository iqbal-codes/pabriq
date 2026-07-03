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

# Copy built application and production dependencies
COPY --from=builder /app/package.json ./package.json
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Expose the default port for TanStack Start (usually 3000)
EXPOSE 3000
ENV PORT=3000
ENV HOST=0.0.0.0

# Start the server using node and import sentry instrumentation
CMD ["node", "--import", "./dist/server/instrument.server.mjs", "dist/server/server.js"]
