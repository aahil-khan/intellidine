FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ openssl && rm -rf /var/lib/apt/lists/*

COPY notification-service/package.json ./
COPY notification-service/package-lock.json* ./
COPY notification-service/.npmrc* ./
RUN npm install --legacy-peer-deps --no-optional --prefer-offline --no-audit

COPY notification-service/tsconfig.json ./tsconfig.json
COPY notification-service/src ./src
COPY shared ./shared

RUN npx nest build

# Runtime stage
FROM node:20-slim
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3106
CMD ["node", "dist/src/main.js"]

