import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

import { platformService } from '@nexus/database';
import {
  fail,
  leaderboardSchema,
  ok,
  paginationSchema,
  playKenoSchema,
  adminGameConfigSchema,
  adminUserStatusSchema,
  telegramAuthSchema,
  type AdminRole,
} from '@nexus/shared';
import { getEnv, signSessionToken, verifySessionToken } from '@nexus/security';
import { getTelegramUserFromInitData } from '@nexus/telegram';

declare module 'fastify' {
  interface FastifyRequest {
    sessionUser?: { id: string; telegramId: string; role: AdminRole | null };
  }
}

const errorMap: Record<string, { code: any; message: string; statusCode: number }> = {
  AUTH_INVALID: { code: 'AUTH_INVALID', message: 'Telegram authentication failed.', statusCode: 401 },
  USER_NOT_FOUND: { code: 'USER_NOT_FOUND', message: 'The requested user could not be found.', statusCode: 404 },
  INSUFFICIENT_CREDITS: { code: 'INSUFFICIENT_CREDITS', message: 'You do not have enough credits.', statusCode: 409 },
  GAME_NOT_FOUND: { code: 'GAME_NOT_FOUND', message: 'The requested game could not be found.', statusCode: 404 },
  GAME_ALREADY_COMPLETED: { code: 'GAME_ALREADY_COMPLETED', message: 'This game request was already completed.', statusCode: 409 },
  INVALID_NUMBERS: { code: 'INVALID_NUMBERS', message: 'Selected numbers are invalid.', statusCode: 400 },
  INVALID_STAKE: { code: 'INVALID_STAKE', message: 'Stake is outside the allowed range.', statusCode: 400 },
  RATE_LIMITED: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.', statusCode: 429 },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', message: 'Authentication is required.', statusCode: 401 },
  FORBIDDEN: { code: 'FORBIDDEN', message: 'You are not allowed to perform this action.', statusCode: 403 },
};

export const createApp = () => {
  const env = getEnv();
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport: env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty' },
    },
    bodyLimit: 1024 * 1024,
  });

  app.register(cors, {
    origin: [env.TELEGRAM_WEBAPP_URL, env.NEXT_PUBLIC_API_BASE_URL ?? env.TELEGRAM_WEBAPP_URL],
    credentials: true,
  });
  app.register(helmet);
  app.register(rateLimit, { max: 60, timeWindow: '1 minute' });

  app.addHook('onResponse', async (request, reply) => {
    request.log.info({
      request_id: request.id,
      user_id: request.sessionUser?.id ?? null,
      endpoint: request.url,
      status: reply.statusCode,
      latency: reply.elapsedTime,
    });
  });

  const requireAuth = async (request: Parameters<typeof app.get>[1] extends never ? never : any, reply: any) => {
    const authorization = request.headers.authorization;
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return reply.code(401).send(fail({ code: 'UNAUTHORIZED', message: 'Authentication is required.' }));
    }

    try {
      request.sessionUser = await verifySessionToken(token, env.JWT_SECRET);
    } catch {
      return reply.code(401).send(fail({ code: 'AUTH_INVALID', message: 'Session token is invalid.' }));
    }
  };

  const requireAdmin = async (request: any, reply: any) => {
    await requireAuth(request, reply);
    if (reply.sent) return;
    if (!request.sessionUser?.role || request.sessionUser.role === 'SUPPORT' && request.method !== 'GET') {
      return reply.code(403).send(fail({ code: 'FORBIDDEN', message: 'Admin access is required.' }));
    }
  };

  app.get('/health', async () => ok({ status: 'ok' }));
  app.get('/ready', async () => ok({ status: 'ready' }));

  app.post('/api/auth/telegram', async (request, reply) => {
    try {
      const { initData } = telegramAuthSchema.parse(request.body ?? {});
      const telegramUser = getTelegramUserFromInitData(initData, env.TELEGRAM_BOT_TOKEN);
      const { user, wallet, role } = await platformService.syncTelegramUser({
        telegramId: String(telegramUser.id),
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        avatarUrl: telegramUser.photo_url,
      });

      const token = await signSessionToken({ id: user.id, telegramId: user.telegramId, role }, env.JWT_SECRET);
      return reply.send(
        ok({
          token,
          user: {
            id: user.id,
            telegramId: user.telegramId,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            avatarUrl: user.avatarUrl,
            status: user.status,
            balance: wallet.balance,
            role,
          },
        }),
      );
    } catch (error) {
      throw error;
    }
  });

  app.get('/api/me', { preHandler: requireAuth }, async (request) => {
    const user = await platformService.getMe(request.sessionUser!.id);
    return ok({
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      balance: user.wallet?.balance ?? 0,
      role: user.adminUser?.role ?? null,
    });
  });

  app.get('/api/me/balance', { preHandler: requireAuth }, async (request) => {
    const balance = await platformService.getBalance(request.sessionUser!.id);
    return ok({ balance });
  });

  app.get('/api/me/history', { preHandler: requireAuth }, async (request) => {
    const { page, limit } = paginationSchema.parse(request.query ?? {});
    const history = await platformService.getHistory(request.sessionUser!.id, page, limit);
    return ok({ items: history, page, limit });
  });

  app.get('/api/games', async () => ok({ games: ['KENO', 'DICE', 'NUMBER_GUESS'] }));

  app.get('/api/games/keno/config', { preHandler: requireAuth }, async () => ok(await platformService.getKenoConfig()));

  app.post('/api/games/keno/play', { preHandler: requireAuth }, async (request, reply) => {
    const idempotencyKey = String(request.headers['idempotency-key'] ?? '');
    if (!idempotencyKey) {
      return reply.code(400).send(fail({ code: 'VALIDATION_ERROR', message: 'Idempotency-Key header is required.' }));
    }

    const body = playKenoSchema.parse(request.body ?? {});
    const result = await platformService.playKeno({
      userId: request.sessionUser!.id,
      stake: body.stake,
      selectedNumbers: body.selectedNumbers,
      idempotencyKey,
    });

    return ok(result);
  });

  app.get('/api/games/:id', { preHandler: requireAuth }, async (request: any) => {
    const game = await platformService.getGameForUser(request.sessionUser!.id, request.params.id);
    return ok(game);
  });

  app.get('/api/bonus', { preHandler: requireAuth }, async (request) => ok(await platformService.getDailyBonusStatus(request.sessionUser!.id)));

  app.post('/api/bonus/claim', { preHandler: requireAuth }, async (request, reply) => {
    const idempotencyKey = String(request.headers['idempotency-key'] ?? '');
    if (!idempotencyKey) {
      return reply.code(400).send(fail({ code: 'VALIDATION_ERROR', message: 'Idempotency-Key header is required.' }));
    }

    return ok(await platformService.claimDailyBonus(request.sessionUser!.id, idempotencyKey));
  });

  app.get('/api/leaderboard', async (request) => {
    const { window } = leaderboardSchema.parse(request.query ?? {});
    return ok({ window, items: await platformService.getLeaderboard(window) });
  });

  app.get('/api/admin/dashboard', { preHandler: requireAdmin }, async () => ok(await platformService.getAdminDashboard()));
  app.get('/api/admin/users', { preHandler: requireAdmin }, async (request: any) => ok(await platformService.listUsers(request.query?.q)));
  app.get('/api/admin/users/:id', { preHandler: requireAdmin }, async (request: any) => ok(await platformService.getAdminUserDetail(request.params.id)));
  app.patch('/api/admin/users/:id/status', { preHandler: requireAdmin }, async (request: any) => {
    const { status } = adminUserStatusSchema.parse(request.body ?? {});
    return ok(await platformService.updateUserStatus(request.sessionUser!, request.params.id, status));
  });
  app.get('/api/admin/games', { preHandler: requireAdmin }, async () => ok(await platformService.listGameConfigs()));
  app.patch('/api/admin/games/:id', { preHandler: requireAdmin }, async (request, reply) => {
    if ((request.params as { id: string }).id !== 'keno') {
      return reply
        .code(404)
        .send(fail({ code: 'GAME_NOT_FOUND', message: 'Only the Keno configuration is available right now.' }));
    }
    const payload = adminGameConfigSchema.parse(request.body ?? {});
    return ok(await platformService.updateKenoConfig(request.sessionUser!, payload));
  });
  app.get('/api/admin/audit-logs', { preHandler: requireAdmin }, async () => ok(await platformService.listAuditLogs()));

  app.setErrorHandler((error, request, reply) => {
    const mapped = error instanceof Error ? errorMap[error.message] : undefined;
    if (mapped) {
      return reply.code(mapped.statusCode).send(fail({ code: mapped.code, message: mapped.message }));
    }

    request.log?.error?.({ err: error, error_code: 'INTERNAL_ERROR' });
    return reply.code(500).send(fail({ code: 'INTERNAL_ERROR', message: 'Something went wrong.' }));
  });

  return app;
};
