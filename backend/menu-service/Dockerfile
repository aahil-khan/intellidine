FROM node:20-alpine AS build
WORKDIR /app
RUN apk update && apk add --no-cache python3 make g++ openssl openssl-dev || apk add --no-cache openssl
# Copy package files first
COPY menu-service/package.json ./
COPY menu-service/package-lock.json* ./
COPY menu-service/.npmrc* ./
# Install dependencies in /app root level so shared auth can access node_modules
RUN npm install --legacy-peer-deps 2>&1 | tail -20
# Now copy source files
COPY menu-service/tsconfig.json ./tsconfig.json
COPY menu-service/src ./src
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
EXPOSE 3003
CMD ["node", "dist/src/main.js"]

