# backend/Dockerfile
FROM node:22-alpine

# Instalar herramientas básicas (opcional, pero útil para debug)
RUN apk add --no-cache bash curl

WORKDIR /app

# Copiamos solo el package.json primero para aprovechar la caché de Docker
COPY package*.json ./

# Instalamos dependencias
RUN npm install

# Copiamos el resto del código
COPY . .

# Exponemos el puerto
EXPOSE 3000

# Comando por defecto (Dev mode)
CMD ["npm", "run", "dev"]