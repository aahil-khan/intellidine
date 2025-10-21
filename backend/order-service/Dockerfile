FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ openssl && rm -rf /var/lib/apt/lists/*

COPY order-service/package.json ./
COPY order-service/package-lock.json* ./
COPY order-service/.npmrc* ./
RUN npm install --legacy-peer-deps --no-optional --prefer-offline --no-audit

COPY order-service/tsconfig.json ./tsconfig.json
COPY order-service/src ./src
COPY shared ./shared
COPY prisma ./prisma
RUN PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x npx prisma generate
RUN npx nest build

FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3102
CMD ["node", "dist/src/main.js"]

