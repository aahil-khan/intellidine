FROM node:20-alpine AS build
RUN apk update && apk add --no-cache openssl || apk add --no-cache openssl
WORKDIR /app
COPY inventory-service/package.json ./
COPY inventory-service/package-lock.json* ./
RUN npm install --legacy-peer-deps
RUN apk update && apk add --no-cache python3 make g++ || true
COPY inventory-service/tsconfig.json ./tsconfig.json
COPY inventory-service/src ./src
COPY shared ./shared
COPY prisma ./prisma
RUN npx prisma generate --skip-engine-check
RUN npx nest build

FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER nestjs
EXPOSE 3004
CMD ["node", "dist/src/main.js"]

