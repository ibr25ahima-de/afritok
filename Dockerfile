FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache unzip

COPY afritok-complete_1.zip /app/

RUN unzip afritok-complete_1.zip

# Affiche le contenu pour debug (important)
RUN ls -la /app

# Aller dans le bon dossier automatiquement
WORKDIR /app

# Installer les dépendances (si package.json est à la racine extraite)
RUN npm install

# Build
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "preview"]
