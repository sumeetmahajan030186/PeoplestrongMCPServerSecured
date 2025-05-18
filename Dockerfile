# ---------- build stage ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json src/ ./
RUN npm run build                 # compiles to dist/

# ---------- runtime stage ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev             # tiny final layer
EXPOSE 8000
CMD [ "node", "dist/server.js" ]
