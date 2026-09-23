# Database

Prisma schema: `packages/database/prisma/schema.prisma`

## Tables
- `users`
- `wallets`
- `wallet_transactions`
- `games`
- `game_configs`
- `daily_bonuses`
- `leaderboard_entries`
- `admin_users`
- `audit_logs`
- `sessions`

## Ledger rule
Balances are only changed through `wallet_transactions` entries created inside DB transactions. Stake deductions and rewards are separate immutable records containing `balance_before` and `balance_after`.

## Migration commands
- `npm run prisma:generate`
- `npm run prisma:migrate`
