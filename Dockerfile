FROM node:20-alpine

# Dossier de travail
WORKDIR /app

# Installer unzip
RUN apk add --no-cache unzip

# Copier le zip dans l’image
COPY afritok-complete_1.zip /app/app.zip

# Décompresser
RUN unzip app.zip && rm app.zip

# Installer les dépendances
RUN npm install --legacy-peer-deps

# Build du frontend
RUN npm run build

# Exposer le port (Render)
EXPOSE 3000

# Lancer l’app
CMD ["npm", "start"]
