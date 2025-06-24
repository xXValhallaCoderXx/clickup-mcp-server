FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create context directory
RUN mkdir -p /app/context

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]