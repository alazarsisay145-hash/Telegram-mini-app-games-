export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';
export type GameStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type GameType = 'KENO' | 'DICE' | 'NUMBER_GUESS';
export type WalletTransactionType =
  | 'WELCOME_BONUS'
  | 'DAILY_BONUS'
  | 'PROMO_GRANT'
  | 'ADMIN_GRANT'
  | 'GAME_STAKE'
  | 'GAME_REWARD';
export type ReferenceType = 'GAME' | 'BONUS' | 'ADMIN' | 'SYSTEM';
export type LeaderboardWindow = 'daily' | 'weekly' | 'monthly' | 'all-time';
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT';

export interface ApiErrorShape {
  code:
    | 'AUTH_INVALID'
    | 'USER_NOT_FOUND'
    | 'INSUFFICIENT_CREDITS'
    | 'GAME_NOT_FOUND'
    | 'GAME_ALREADY_COMPLETED'
    | 'INVALID_NUMBERS'
    | 'INVALID_GUESS'
    | 'INVALID_STAKE'
    | 'RATE_LIMITED'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'VALIDATION_ERROR'
    | 'INTERNAL_ERROR';
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiErrorShape | null;
}

export interface SessionUser {
  id: string;
  telegramId: string;
  role: AdminRole | null;
}

export interface KenoConfig {
  gameType: 'KENO';
  enabled: boolean;
  minStake: number;
  maxStake: number;
  payoutTable: Record<number, Record<number, number>>;
}

export interface DailyBonusStatus {
  amount: number;
  canClaim: boolean;
  nextClaimAt: string | null;
}

export interface HistoryItem {
  gameId: string;
  gameType: GameType;
  stake: number;
  selectedNumbers: number[];
  drawNumbers: number[];
  matches: number;
  payout: number;
  status: GameStatus;
  createdAt: string;
  completedAt: string | null;
}
