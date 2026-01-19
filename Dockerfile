
FROM node:20-alpine

WORKDIR /app

# Outils nécessaires
RUN apk add --no-cache unzip

# Copier et dézipper l'application complète
COPY afritok-complete_1.zip /app/app.zip
RUN unzip app.zip && rm app.zip

# =====================
# VARIABLES VITE (OBLIGATOIRES AU BUILD)
# =====================
ARG VITE_API_BASE_URL=https://afritok-backend.onrender.com
ARG VITE_APP_TITLE=Afritok
ARG VITE_APP_LOGO=https://example.com/logo.png
ARG VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
ARG VITE_ANALYTICS_WEBSITE_ID=disabled

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_LOGO=$VITE_APP_LOGO
ENV VITE_ANALYTICS_ENDPOINT=$VITE_ANALYTICS_ENDPOINT
ENV VITE_ANALYTICS_WEBSITE_ID=$VITE_ANALYTICS_WEBSITE_ID

# =====================
# BUILD FRONTEND + BACKEND
# =====================
WORKDIR /app/upload/afritok
RUN npm install --legacy-peer-deps
RUN npm run build

# =====================
# LANCEMENT
# =====================
EXPOSE 10000
CMD ["npm", "start"]
