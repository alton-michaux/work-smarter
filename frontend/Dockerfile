# Dev stage: what `docker compose up` runs locally (bind-mounted source, HMR).
FROM node:22 AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# --- Production image (default target for a plain `docker build`) ---

FROM node:22 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22 AS builder
WORKDIR /app
# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, not
# read at runtime — .env.local is excluded from the build context (see
# .dockerignore), so this must be supplied explicitly via --build-arg.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
