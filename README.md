# NEXUS GAMES

A production-oriented Telegram Mini App + Telegram Bot gaming platform built in strict TypeScript with virtual credits only.

> Credits are virtual only for entertainment. They are not money and cannot be withdrawn or exchanged for cash.

## Project tree
```text
apps/
  admin/   Next.js admin dashboard
  api/     Fastify REST API
  bot/     Telegram bot
  web/     Next.js Telegram Mini App
packages/
  database/    Prisma schema + transactional service layer
  game-engine/ Keno, Dice, Number Guess engines
  security/    JWT + env validation
  shared/      shared types, schemas, envelopes, constants
  telegram/    Telegram auth verification and bot copy helpers
  ui/          shared React UI primitives
infrastructure/
  docker-compose.yml
docs/
  architecture.md
  api.md
  database.md
  deployment.md
  security.md
```

## Environment variables
See `.env.example`.

## Install and validate
```bash
npm install
npm run prisma:generate
npm run typecheck
npm run test -w @nexus/game-engine
npm run test -w @nexus/api
npm run build
```

## Development
```bash
npm run dev -w @nexus/api
npm run dev -w @nexus/web
npm run dev -w @nexus/admin
npm run dev -w @nexus/bot
```

## Production
```bash
docker build --build-arg APP_NAME=api -t nexus-api .
docker build --build-arg APP_NAME=web -t nexus-web .
docker build --build-arg APP_NAME=admin -t nexus-admin .
docker build --build-arg APP_NAME=bot -t nexus-bot .
```

## Features implemented
- Telegram-authenticated user sync and welcome bonus
- Immutable virtual-credit wallet ledger
- Keno engine with secure randomness and configurable payout table
- Daily bonus with UTC-day enforcement and idempotency
- Leaderboard, history, admin dashboard endpoints, and audit logs
- Telegram bot command surface and Mini App / admin UIs
- Docker, CI, Prisma schema, and deployment docs
