import { z } from 'zod';

export const telegramAuthSchema = z.object({
  initData: z.string().min(10),
});

export const playKenoSchema = z.object({
  stake: z.number().int().positive(),
  selectedNumbers: z
    .array(z.number().int().min(1).max(80))
    .min(1)
    .max(10)
    .refine((numbers) => new Set(numbers).size === numbers.length, 'Numbers must be unique'),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const leaderboardSchema = z.object({
  window: z.enum(['daily', 'weekly', 'monthly', 'all-time']).default('daily'),
});

export const adminUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']),
});

export const adminGameConfigSchema = z.object({
  enabled: z.boolean().optional(),
  minStake: z.number().int().positive().optional(),
  maxStake: z.number().int().positive().optional(),
  payoutTable: z.record(z.string(), z.record(z.string(), z.number().int().nonnegative())).optional(),
  dailyBonusAmount: z.number().int().positive().optional(),
});
