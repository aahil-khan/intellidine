FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl python3 make g++
COPY payment-service/package.json payment-service/package-lock.json* payment-service/.npmrc* ./
RUN npm ci || npm i
COPY payment-service/tsconfig.json ./tsconfig.json
COPY payment-service/src ./src
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
COPY prisma ./prisma
EXPOSE 3005
CMD ["node", "dist/main.js"]

