# Server image for Sea3Battle. Three-stage build:
#   1. deps    — install full node_modules (including dev) for the build
#   2. build   — compile TS → dist/
#   3. runtime — production-only node_modules + dist/, run as `node`
#
# Build context MUST be `apps/server` (i.e. `docker build apps/server`),
# not the repo root.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force && apk add --no-cache ca-certificates
COPY --from=build /app/dist ./dist

# Create a writable directory for the file-backed leaderboard. The path
# is overridable via LEADERBOARD_PATH; in production we'll mount a
# Fly volume here so the leaderboard survives restarts.
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

EXPOSE 3001
CMD ["node", "dist/index.js"]
