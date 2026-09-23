# Deployment

## Environment variables
Copy `.env.example` into a real `.env` file and replace placeholder values.

## Local development
```bash
npm install
npm run prisma:generate
npm run typecheck
npm run test -w @nexus/game-engine
npm run test -w @nexus/api
npm run build
```

## Start services
```bash
npm run dev -w @nexus/api
npm run dev -w @nexus/web
npm run dev -w @nexus/admin
npm run dev -w @nexus/bot
```

## Production container builds
```bash
docker build --build-arg APP_NAME=api -t nexus-api .
docker build --build-arg APP_NAME=web -t nexus-web .
docker build --build-arg APP_NAME=admin -t nexus-admin .
docker build --build-arg APP_NAME=bot -t nexus-bot .
docker compose -f infrastructure/docker-compose.yml up --build
```

## Telegram setup
1. Create a bot with BotFather.
2. Set the Mini App URL to the deployed `web` app.
3. Put the BotFather token in `TELEGRAM_BOT_TOKEN`.
4. Share the public Mini App URL as `TELEGRAM_WEBAPP_URL`.

## First admin
Create the desired Telegram user first, then insert an `admin_users` row referencing that `users.id` with role `SUPER_ADMIN`.
