# Dependencies stage
FROM node:20-alpine AS deps
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY shared ../shared
COPY frontend .
# NEXT_PUBLIC_* variables are inlined into the client bundle at build time,
# so this must be an ARG/ENV available before `npm run build`, not a
# container-runtime environment variable (which would have no effect).
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build

# Development stage: runs `next dev` with the full toolchain so edits on the
# host trigger Fast Refresh. Selected via `target: dev` in docker-compose.dev.yml.
# Not used in production — the runner stage below is the deployable image.
FROM node:20-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY shared ../shared
COPY frontend .
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev:docker"]

# Runtime stage
FROM node:20-alpine AS runner
RUN addgroup -S hesperides && adduser -S hesperides -G hesperides
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder --chown=hesperides:hesperides /app/.next/standalone ./
COPY --from=builder --chown=hesperides:hesperides /app/.next/static ./.next/static
USER hesperides
EXPOSE 3000
CMD ["node", "server.js"]
