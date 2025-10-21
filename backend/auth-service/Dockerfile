FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ openssl && rm -rf /var/lib/apt/lists/*

COPY auth-service/package.json auth-service/package-lock.json* auth-service/.npmrc* ./
RUN npm install --legacy-peer-deps --no-optional --prefer-offline --no-audit

COPY auth-service/tsconfig.json ./tsconfig.json
COPY auth-service/src ./src
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
EXPOSE 3101
CMD ["node", "dist/main.js"]

