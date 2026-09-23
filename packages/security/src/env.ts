import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBAPP_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  ADMIN_SECRET: z.string().min(16),
  API_PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export const getEnv = (source: NodeJS.ProcessEnv = process.env): AppEnv => envSchema.parse(source);
