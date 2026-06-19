# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm ci
RUN cd server && npm ci

# Copy source code
COPY . .

# Build Vue frontend
RUN npm run build

# Expose port
EXPOSE 4000

# Start the server
CMD ["node", "server/index.js"]