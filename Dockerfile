
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache unzip

COPY afritok-complete_1.zip /app/app.zip

RUN unzip app.zip && rm app.zip

# 👉 ON ENTRE DANS LE BON DOSSIER
WORKDIR /app/upload

RUN npm install --legacy-peer-deps

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
