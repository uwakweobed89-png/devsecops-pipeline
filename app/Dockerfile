# Use an official Node.js runtime as a parent image
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src

# Run tests during the build stage
FROM node:22-alpine AS runtime
# Create a non-root user to run the application
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
# Copy only the necessary files from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY package.json ./
# Change ownership of the application files to the non-root user
USER appuser
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1
CMD ["node", "src/index.js"]
