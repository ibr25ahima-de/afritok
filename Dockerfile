# =========================
# Stage 1: Build
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json ./
RUN pnpm install

COPY . .
RUN pnpm run build


# =========================
# Stage 2: Runtime
# =========================
FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist

RUN addgroup -g 1001 -S nodejs \
  && adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

# 🔥 BON CHEMIN
CMD ["node", "dist/index.js"]
