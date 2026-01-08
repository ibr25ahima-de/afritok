FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache unzip

COPY afritok-complete_1.zip /app/

# Dézip
RUN unzip afritok-complete_1.zip

# Aller dans le frontend
WORKDIR /app/upload/client

# Installer les dépendances
RUN npm install

# Build frontend
RUN npm run build

# Render utilise le port 10000
EXPOSE 10000

# Lancer Vite sur le port Render
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "10000"]
