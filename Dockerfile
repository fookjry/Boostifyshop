# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.ts ./
COPY --from=build /app/firebase-applet-config.json ./
COPY --from=build /app/tsconfig.json ./

# Install tsx for running server.ts
RUN npm install -g tsx

EXPOSE 3000
CMD ["tsx", "server.ts"]
