
FROM node:20-alpine

WORKDIR /app

# =====================
# ÉTAPE 1: DÉCOMPRESSER LE ZIP
# =====================
RUN apk add --no-cache unzip

COPY afritok-complete_1.zip /app/app.zip
RUN unzip app.zip && rm app.zip

# =====================
# ÉTAPE 2: VARIABLES FRONTEND
# =====================
ARG VITE_API_BASE_URL
ARG VITE_OAUTH_PORTAL_URL
ARG VITE_APP_ID
ARG VITE_APP_TITLE
ARG VITE_APP_LOGO

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_OAUTH_PORTAL_URL=$VITE_OAUTH_PORTAL_URL
ENV VITE_APP_ID=$VITE_APP_ID
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_LOGO=$VITE_APP_LOGO

# =====================
# ÉTAPE 3: INSTALLER LES DÉPENDANCES
# =====================
WORKDIR /app/upload/afritok
RUN npm install --legacy-peer-deps

# =====================
# ÉTAPE 4: COMPILER VITE
# =====================
RUN npm run build

# =====================
# ÉTAPE 5: VÉRIFIER QUE LE BUILD A RÉUSSI ✅ NOUVEAU
# =====================
RUN ls -la dist/public/ || echo "⚠️  dist/public/ not found!"
RUN test -f dist/public/index.html || (echo "❌ ERROR: dist/public/index.html not found!" && exit 1)

# =====================
# ÉTAPE 6: CONFIGURER LE PORT
# =====================
EXPOSE 10000

# =====================
# ÉTAPE 7: DÉMARRER L'APPLICATION
# =====================
CMD ["npm", "start"]
