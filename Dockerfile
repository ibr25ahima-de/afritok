
FROM node:20-alpine

WORKDIR /app

# Installer les dépendances
COPY package.json package-lock.json* ./
RUN npm install

# Copier le code
COPY . .

# 🔥 COMPILATION TYPESCRIPT (TRÈS IMPORTANT)
RUN npm run build

# Démarrage en production
CMD ["node", "dist/index.js"]
