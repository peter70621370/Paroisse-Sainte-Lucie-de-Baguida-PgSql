# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY package*.json ./

# ---- Développement (hot reload, sources montées en volume) ----
FROM base AS dev
RUN npm ci
COPY . .
RUN npx prisma generate
CMD ["npx", "tsx", "watch", "src/server.ts"]

# ---- Compilation ----
FROM base AS build
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# ---- Production ----
FROM base AS prod
ENV NODE_ENV=production
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=build /app/dist ./dist
USER node
EXPOSE 4000
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/server.js"]
