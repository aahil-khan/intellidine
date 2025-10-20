FROM node:20-alpine AS build
WORKDIR /app
RUN apk update && apk add --no-cache python3 make g++ openssl openssl-dev || apk add --no-cache openssl
COPY auth-service/package.json auth-service/package-lock.json* auth-service/.npmrc* ./
RUN npm ci --legacy-peer-deps 2>&1 | tail -20 || npm i --legacy-peer-deps 2>&1 | tail -20
COPY auth-service/tsconfig.json ./tsconfig.json
COPY auth-service/src ./src
# Copy Prisma schema for client generation
COPY prisma ./prisma
RUN npx prisma generate
RUN npx nest build || npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/main.js"]

