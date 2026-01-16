public node:20-alpine

WORKDIR /app

# Outils nécessaires
RUN apk add --no-cache unzip

# Copier et dézipper le projet
COPY afritok-complete_1.zip /app/app.zip
RUN unzip app.zip && rm app.zip

# =====================
# BACKEND
# =====================
WORKDIR /app/upload/afritok
RUN npm install --legacy-peer-deps
RUN npm run build

# =====================
# FRONTEND
# =====================
WORKDIR /app/upload/afritok/client
RUN npm install --legacy-peer-deps
RUN npm run build

# Copier le build frontend vers le backend (public)
RUN rm -rf /app/upload/afritok/public
RUN cp -r dist/public /app/upload/afritok/public

# =====================
# LANCEMENT
# =====================
WORKDIR /app/upload/afritok
EXPOSE 10000
CMD ["npm", "start"]
