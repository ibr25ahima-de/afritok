FROM node:20-alpine

# Dossier de travail
WORKDIR /app

# Copier tout le projet
COPY . .

# Aller dans le frontend
WORKDIR /app/upload/client

# Installer les dépendances (sans conflit)
RUN npm install --legacy-peer-deps

# Build du frontend
RUN npm run build

# Exposer le port utilisé par Vite preview
EXPOSE 10000

# Lancer le frontend
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "10000"]
