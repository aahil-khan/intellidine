FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl openssl-dev
COPY order-service/package.json ./
COPY order-service/package-lock.json* ./
RUN npm install
COPY order-service/tsconfig.json ./tsconfig.json
COPY order-service/src ./src
COPY shared ./shared
COPY prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npx nest build || npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3002
CMD ["node", "dist/src/main.js"]

