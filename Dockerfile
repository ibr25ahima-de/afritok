
# Utilise Node 20 Alpine (léger)
FROM node:20-alpine

# Définit le répertoire de travail
WORKDIR /app

# Copie package.json et package-lock.json
COPY package.json package-lock.json* ./

# Installe les dépendances
RUN npm install

# Copie tout le reste du projet
COPY . .

# Compile TypeScript
RUN npm run build

# Expose le port fourni par Render
EXPOSE 3000

# Commande pour démarrer l'application
CMD ["node", "dist/index.js"]
