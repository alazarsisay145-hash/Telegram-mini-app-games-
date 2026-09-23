# Architecture

NEXUS GAMES is an npm-workspaces monorepo with four apps (`web`, `api`, `bot`, `admin`) and shared packages for database access, security, Telegram verification, UI, and game-engine logic.

## Core design rules
- Virtual credits only. No deposits, withdrawals, or money-value language in player wallets.
- API and bot both depend on the same transactional `PlatformService` from `packages/database` so wallet mutations stay server-authoritative.
- Games implement shared engine contracts in `packages/game-engine`.
- The Mini App and admin dashboard consume the REST API; they never compute authoritative balances or payouts.

## Flow summary
1. Telegram WebApp init-data or Telegram Bot profile reaches the server.
2. `PlatformService.syncTelegramUser()` upserts the user and wallet and records the welcome bonus in the immutable ledger.
3. Keno play requests require an idempotency key and resolve fully inside a serializable DB transaction.
4. Daily bonus claims use UTC claim keys plus idempotency keys.
5. Admin configuration updates create audit log rows.
