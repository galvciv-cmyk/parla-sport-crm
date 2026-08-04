# Multi-stage Dockerfile for Parla Sport CRM

# --- Stage 1: Build ---
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# --- Stage 2: Serve static files with Nginx ---
FROM nginx:alpine

# Copy custom Nginx configuration to support SPA routing
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
