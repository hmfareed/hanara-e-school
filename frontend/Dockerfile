# ---- Build Stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files and install ALL dependencies (including devDependencies for build tools)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build the Vite/React app
COPY . .
RUN npm run build

# ---- Production Stage ----
FROM nginx:1.27-alpine AS production

# Remove default nginx config and replace with our custom SPA config
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
