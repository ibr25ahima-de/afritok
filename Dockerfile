# Image Node officielle
FROM node:18-alpine

# Dossier de travail
WORKDIR /app

# Installer unzip
RUN apk add --no-cache unzip

# Copier le zip dans le conteneur
COPY afritok-complete_1.zip /app/

# Dézipper l'application
RUN unzip afritok-complete_1.zip && rm afritok-complete_1.zip

# Aller dans le dossier extrait (adapter
