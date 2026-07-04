# ---- Base Stage ----
FROM node:20-alpine AS base
WORKDIR /app

# ---- Dependencies Stage ----
FROM base AS deps
COPY package.json package-lock.json* ./
# Install only production dependencies
RUN npm ci --omit=dev

# ---- Production Stage ----
FROM base AS production
ENV NODE_ENV=production

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the application source
COPY . .

EXPOSE 5000

CMD ["node", "src/server.js"]
