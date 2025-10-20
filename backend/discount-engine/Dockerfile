FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --legacy-peer-deps 2>&1 | tail -5 || npm i --legacy-peer-deps 2>&1 | tail -5
COPY tsconfig.json ./tsconfig.json
COPY src ./src
RUN npx nest build 2>&1 | tail -20 || npm run build 2>&1 | tail -20

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3008
CMD ["node", "dist/main.js"]

