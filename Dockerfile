# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Installer pnpm
RUN npm install -g pnpm

# Copier les fichiers de dépendances
COPY package.json ./

# Installer les dépendances avec la même stratégie que Render
RUN pnpm install --no-frozen-lockfile

# Copier le code source
COPY . .

# Construire l'application
RUN pnpm run build

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Installer pnpm
RUN npm install -g pnpm

# Copier les dépendances du builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copier les fichiers construits
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/drizzle ./drizzle

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Exposer le port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Le build esbuild produit dist/index.js (voir script start)
CMD ["node", "dist/index.js"]
