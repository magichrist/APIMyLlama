FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY ui/package*.json ui/
RUN cd ui && npm ci

COPY . .
RUN npm run build:ui

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/ui/node_modules ./ui/node_modules
COPY --from=builder /app/ui/dist ./ui/dist
COPY --from=builder /app/APIMyLlama.js /app/api.js /app/admin-api.js /app/db.js /app/utils.js ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.env.example ./

ENV NODE_ENV=production
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "APIMyLlama.js"]
