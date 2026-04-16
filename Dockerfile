# Use official Node.js 18 slim image (smaller footprint for Cloud Run)
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy dependency manifests first (leverages Docker layer caching)
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy application source
COPY . .

# Cloud Run provides PORT via environment variable (default 8080)
EXPOSE 8080

# Run as non-root user for security
USER node

# Start the server
CMD ["node", "server.js"]
