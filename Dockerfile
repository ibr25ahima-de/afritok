
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache unzip

COPY afritok-complete_1.zip /app/app.zip
RUN unzip app.zip && rm app.zip

# =====================
# VARIABLES FRONTEND (OBLIGATOIRES AU BUILD)
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
# BUILD
# =====================
WORKDIR /app/upload/afritok
RUN npm install --legacy-peer-deps
RUN npm run build

# =====================
# RUN
# =====================
EXPOSE 10000
CMD ["npm", "start"]
