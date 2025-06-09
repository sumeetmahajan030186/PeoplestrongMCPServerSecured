# ---------- build stage ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src
RUN npm run build

# ---------- runtime stage ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
#COPY src/prompts ./dist/prompts
COPY --from=build /app/src/prompts ./dist/prompts
COPY package*.json ./
RUN npm ci --omit=dev
EXPOSE 8000
CMD [ "node", "dist/server.js" ]