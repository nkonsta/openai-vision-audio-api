# Use official lightweight Node image
FROM node:20-alpine AS base

# Create app directory
WORKDIR /app

# Install production dependencies first for better caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Build TypeScript -> dist/
RUN npm run build

# Environment & network
ENV PORT=3000
EXPOSE 3000

# Run compiled code
CMD ["node", "dist/server.js"] 