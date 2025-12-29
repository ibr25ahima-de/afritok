# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json package-lock.json* ./

# Installer les dépendances
RUN npm install

# Copier le code source
COPY . .

# Build de l’application
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Copier les dépendances et le build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Exposer le port
EXPOSE 3000

# Démarrer l'application
CMD ["node", "dist/index.js"]
