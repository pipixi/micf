# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production Run
FROM node:18-alpine
WORKDIR /app

# Copy built files from builder
COPY --from=builder /app/dist ./

# Install ONLY production dependencies
# Note: dist/package.json is copied above
RUN npm install --production

# Environment variables
ENV NODE_ENV=production

# Expose ports
EXPOSE 80
EXPOSE 443

# Start server
CMD ["npm", "start"]
