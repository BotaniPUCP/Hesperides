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
RUN npm run build

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
