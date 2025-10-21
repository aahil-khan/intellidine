FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ openssl && rm -rf /var/lib/apt/lists/*

COPY payment-service/package.json ./
COPY payment-service/package-lock.json* ./
COPY payment-service/.npmrc* ./
RUN npm install --legacy-peer-deps --no-optional --prefer-offline --no-audit

COPY payment-service/tsconfig.json ./tsconfig.json
COPY payment-service/src ./src
COPY shared ./shared
COPY prisma ./prisma
RUN PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x npx prisma generate
RUN npx nest build

FROM node:20-slim
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3105
CMD ["node", "dist/src/main.js"]

