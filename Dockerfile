FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY apps ./apps
COPY packages ./packages
COPY tsconfig.base.json ./
COPY .env.example ./
RUN npm ci
RUN npm run prisma:generate
RUN npm run build

ARG APP_NAME
ENV APP_NAME=${APP_NAME}

EXPOSE 3000 3001 4000
CMD ["sh", "-c", "case \"$APP_NAME\" in api) npm run start -w @nexus/api ;; web) npm run start -w @nexus/web ;; admin) npm run start -w @nexus/admin ;; bot) npm run start -w @nexus/bot ;; *) echo Unknown APP_NAME: $APP_NAME && exit 1 ;; esac"]
