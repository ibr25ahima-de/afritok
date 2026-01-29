# =========================
# Stage 1: Build
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

# Installer pnpm
RUN npm install -g pnpm

# Copier package.json uniquement (pas de lockfile)
COPY package.json ./

# Installer les dépendances
RUN pnpm install

# Copier tout le code source
COPY . .

# Build de l'application
RUN pnpm run build


# =========================
# Stage 2: Runtime
# =========================
FROM node:20-alpine

WORKDIR /app

# Installer pnpm
RUN npm install -g pnpm

# Copier les dépendances et fichiers nécessaires
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/drizzle ./drizzle

# Sécurité : utilisateur non-root
RUN addgroup -g 1001 -S nodejs \
  && adduser -S nodejs -u 1001

USER nodejs

# Port Render
EXPOSE 3000

# Lancer le serveur
CMD ["node", "dist/server/index.js"]
