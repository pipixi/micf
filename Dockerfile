FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package.json ./
RUN npm install --production

# Copy source code
COPY . .

# Environment variables
ENV NODE_ENV=production

# Expose ports
EXPOSE 80
EXPOSE 443

# Start server
CMD ["npm", "start"]
