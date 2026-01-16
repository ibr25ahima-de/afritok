
FROM node:20-alpine

WORKDIR /app

# Outils nécessaires
RUN apk add --no-cache unzip

# Copier et dézipper le projet
COPY afritok-complete_1.zip /app/app.zip
RUN unzip app.zip && rm app.zip

# =====================
# BACKEND + FRONTEND (build commun)
# =====================
WORKDIR /app/upload/afritok
RUN npm install --legacy-peer-deps
RUN npm run build

# =====================
# LANCEMENT
# =====================
EXPOSE 10000
CMD ["npm", "start"]
