# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
# Copy built assets to Nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html
# Copy Nginx config for API proxying
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Expose port 80 inside the container
EXPOSE 80
# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

