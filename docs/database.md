# Database

Prisma schema: `packages/database/prisma/schema.prisma`

## Tables
- `users`
- `wallets`
- `wallet_transactions`
- `games`
- `game_configs`
- `daily_bonuses`
- `daily_bonus_config`
- `leaderboard_entries`
- `admin_users`
- `audit_logs`
- `sessions`

## Ledger rule
Wallet balances are mutated inside DB transactions, and every balance mutation is accompanied by an immutable `wallet_transactions` record. Stake deductions and rewards are separate immutable records containing `balance_before` and `balance_after`.

## Migration commands
- `npm run prisma:generate`
- `npm run prisma:migrate`
