# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
WORKDIR /app
COPY package*.json ./

# ---- Développement (hot reload, sources montées en volume) ----
FROM base AS dev
RUN npm ci --ignore-scripts
COPY . .
RUN npx nuxt prepare
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- Compilation ----
FROM base AS build
RUN npm ci --ignore-scripts
COPY . .
RUN npx nuxt prepare && npm run build

# ---- Production (sortie Nitro autonome) ----
FROM node:22-bookworm-slim AS prod
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
