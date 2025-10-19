FROM node:20-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY inventory-service/package.json inventory-service/package-lock.json* ./
RUN npm ci || npm i
COPY inventory-service/tsconfig.json ./tsconfig.json
COPY inventory-service/src ./src
COPY prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npx nest build || npm run build

FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
USER nestjs
EXPOSE 3004
CMD ["node", "dist/main.js"]

