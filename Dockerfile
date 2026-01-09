FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances en ignorant les conflits de peer deps
RUN npm install --legacy-peer-deps

# Copier le reste du projet
COPY . .

# Build Vite
RUN npm run build

# Exposer le port (si preview ou serveur)
EXPOSE 4173

# Lancer l’app
CMD ["npm", "run", "preview"]
