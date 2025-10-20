FROM node:20-alpine AS build
WORKDIR /app
RUN apk update && apk add --no-cache python3 make g++ openssl openssl-dev || apk add --no-cache openssl

COPY notification-service/package.json ./
COPY notification-service/package-lock.json* ./
COPY notification-service/.npmrc* ./
RUN npm install --legacy-peer-deps 2>&1 | tail -5

COPY notification-service/tsconfig.json ./tsconfig.json
COPY notification-service/src ./src
COPY shared ./shared

RUN npx nest build 2>&1 | tail -20 || npm run build 2>&1 | tail -20

# Runtime stage
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3006
CMD ["node", "dist/src/main.js"]

