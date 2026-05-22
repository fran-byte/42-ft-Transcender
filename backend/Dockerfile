# backend/Dockerfile
FROM node:22-alpine

# Install basic tools for debugging and healthchecks
RUN apk add --no-cache bash curl

WORKDIR /app

# Copy package.json first to leverage Docker layer caching
# Dependencies are only reinstalled when package.json changes
COPY package*.json ./

# Install production dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

# Expose the backend API port
EXPOSE 3000

# Start the server in production mode
CMD ["npm", "start"]