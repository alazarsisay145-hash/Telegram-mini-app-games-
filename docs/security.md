# Security

- Telegram Mini App init-data verification via HMAC in `packages/telegram`
- JWT session verification in `packages/security`
- Fastify Helmet, CORS, body-size limits, and rate limiting
- Idempotency keys required for Keno play and daily bonus claim
- Server-authoritative balance, payout, and game-resolution logic
- Structured request logging without token/secret output
- Admin routes require server-side role checks
- `.env.example` contains placeholders only
