FROM node:20-slim AS build
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/analytics-service/package.json backend/analytics-service/package-lock.json* ./
RUN npm ci || npm i
COPY backend/analytics-service/tsconfig.json ./tsconfig.json
COPY backend/analytics-service/src ./src
# Copy Prisma schema for client generation
COPY backend/prisma ./prisma
RUN npx prisma generate
RUN npx nest build || npm run build

FROM node:20-slim
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY backend/prisma ./prisma
EXPOSE 3007
CMD ["node", "dist/main.js"]