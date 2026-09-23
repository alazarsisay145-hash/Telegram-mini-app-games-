# API

All endpoints return `{ "success": boolean, "data": any, "error": { code, message } | null }`.

## Public / Auth
- `POST /api/auth/telegram`
- `GET /health`
- `GET /ready`
- `GET /api/games`
- `GET /api/leaderboard?window=daily|weekly|monthly|all-time`

## Authenticated user
- `GET /api/me`
- `GET /api/me/balance`
- `GET /api/me/history?page=1&limit=20`
- `GET /api/games/keno/config`
- `POST /api/games/keno/play` (`Idempotency-Key` header required)
- `GET /api/games/:id`
- `GET /api/bonus`
- `POST /api/bonus/claim` (`Idempotency-Key` header required)

## Admin
- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `PATCH /api/admin/users/:id/status`
- `GET /api/admin/games`
- `PATCH /api/admin/games/:id`
- `GET /api/admin/audit-logs`
