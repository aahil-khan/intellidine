FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ openssl && rm -rf /var/lib/apt/lists/*

COPY api-gateway/package.json ./
COPY api-gateway/package-lock.json* ./
COPY api-gateway/.npmrc* ./
RUN npm install --legacy-peer-deps --no-optional --prefer-offline --no-audit

COPY api-gateway/tsconfig.json ./tsconfig.json
COPY prisma ./prisma
COPY api-gateway/src ./src
COPY shared ./shared

# Force Prisma to generate with the correct target
RUN PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x npx prisma generate
RUN npx nest build

# Runtime stage
FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 3100
CMD ["node", "dist/src/main.js"]

