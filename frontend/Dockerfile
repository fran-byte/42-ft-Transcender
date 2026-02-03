# frontend/Dockerfile
FROM node:22-alpine

# Instalar bash por si quieres entrar al contenedor
RUN apk add --no-cache bash

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5173

# Importante: --host para que se vea desde fuera del contenedor
CMD ["npm", "run", "dev", "--", "--host"]