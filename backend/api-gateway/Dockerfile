FROM node:20-alpine AS build
WORKDIR /app
RUN apk update && apk add --no-cache python3 make g++ openssl openssl-dev || apk add --no-cache openssl

COPY api-gateway/package.json ./
COPY api-gateway/package-lock.json* ./
COPY api-gateway/.npmrc* ./
RUN npm install --legacy-peer-deps 2>&1 | tail -5

COPY api-gateway/tsconfig.json ./tsconfig.json
COPY prisma ./prisma
COPY api-gateway/src ./src
COPY shared ./shared

RUN npx prisma generate --skip-engine-check 2>&1 | tail -5
RUN npx nest build

# Runtime stage
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/src/main.js"]

