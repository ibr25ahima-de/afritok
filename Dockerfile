FROM node:20-alpine

WORKDIR /app
RUN apk add --no-cache unzip

COPY afritok-complete_1.zip /app/app.zip
RUN unzip app.zip && rm app.zip

# BACKEND
WORKDIR /app/upload/afritok
RUN npm install --legacy-peer-deps
RUN npm run build

# FRONTEND
WORKDIR /app/upload/afritok/client
RUN npm install --legacy-peer-deps
RUN npm run build

# Copier le frontend buildé dans le backend
RUN cp -r dist /app/upload/afritok/public

EXPOSE 10000
CMD ["npm", "start"]
