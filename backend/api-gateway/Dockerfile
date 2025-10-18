FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl openssl-dev
COPY api-gateway/package.json api-gateway/package-lock.json* api-gateway/.npmrc* ./
RUN npm ci || npm i
COPY api-gateway/tsconfig.json ./tsconfig.json
COPY prisma ./prisma
COPY api-gateway/src ./src
RUN npx prisma generate && (npx nest build || npm run build)

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/main.js"]

