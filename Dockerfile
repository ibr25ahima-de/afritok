
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# 🔴 IMPORTANT : on compile TypeScript
RUN npm run build

# 🔴 On démarre le serveur compilé
CMD ["node", "dist/server.js"]
