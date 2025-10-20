FROM node:20-alpine AS build
WORKDIR /app
RUN apk update && apk add --no-cache openssl python3 make g++ || apk add --no-cache openssl
COPY payment-service/package.json ./
COPY payment-service/package-lock.json* ./
COPY payment-service/.npmrc* ./
RUN npm install --legacy-peer-deps 2>&1 | tail -20
COPY payment-service/tsconfig.json ./tsconfig.json
COPY payment-service/src ./src
COPY shared ./shared
COPY prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npx nest build || npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3005
CMD ["node", "dist/src/main.js"]

