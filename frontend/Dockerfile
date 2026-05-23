# frontend/Dockerfile

# --- Stage 1: Build ---
# Installs dependencies and compiles the React app into static files.
# This stage is discarded after the build — nothing from here reaches production.
FROM node:22-alpine AS builder

RUN apk add --no-cache bash

WORKDIR /app

# Copy package.json first to leverage Docker layer caching.
# Dependencies are only reinstalled when package.json changes.
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the production bundle — outputs to /app/dist
RUN npm run build

# --- Stage 2: Export static files ---
# Minimal image that only contains the built files.
# Nginx will mount these via a shared volume and serve them directly.
FROM alpine:latest

WORKDIR /app/dist

COPY --from=builder /app/dist .
