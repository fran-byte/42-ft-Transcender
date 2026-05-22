# frontend/Dockerfile

# --- Stage 1: Build ---
FROM node:22-alpine AS builder

RUN apk add --no-cache bash

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# --- Stage 2: Export static files ---
FROM alpine:latest

WORKDIR /app/dist

COPY --from=builder /app/dist .
