import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const { updateKenoConfig } = vi.hoisted(() => ({
  updateKenoConfig: vi.fn().mockResolvedValue({ enabled: true, minStake: 100, maxStake: 5000, payoutTable: {} }),
}));

vi.mock('@nexus/database', () => ({
  platformService: {
    updateKenoConfig,
  },
}));

import { createApp } from '../src/app';
import { signSessionToken } from '@nexus/security';

let app: ReturnType<typeof createApp>;

describe('admin game config route', () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = '******localhost:5432/nexus_games?schema=public';
    process.env.TELEGRAM_BOT_TOKEN = '123456:TEST_TEST_TEST_TEST';
    process.env.TELEGRAM_WEBAPP_URL = 'http://localhost:3000';
    process.env.ADMIN_APP_URL = 'http://localhost:3001';
    process.env.JWT_SECRET = 'super-secret-token-value';
    process.env.ADMIN_SECRET = 'another-super-secret';
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:4000';
    app = createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts lowercase keno route ids', async () => {
    const token = await signSessionToken({ id: 'admin-1', telegramId: '42', role: 'ADMIN' }, process.env.JWT_SECRET!);
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/admin/games/keno',
      headers: { authorization: 'Bearer ' + token },
      payload: { minStake: 200 },
    });

    expect(response.statusCode).toBe(200);
    expect(updateKenoConfig).toHaveBeenCalled();
  });

  it('returns 404 for non-keno ids', async () => {
    const token = await signSessionToken({ id: 'admin-1', telegramId: '42', role: 'ADMIN' }, process.env.JWT_SECRET!);
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/admin/games/dice',
      headers: { authorization: 'Bearer ' + token },
      payload: { minStake: 200 },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      success: false,
      data: null,
      error: {
        code: 'GAME_NOT_FOUND',
        message: 'Only the Keno configuration is available right now.',
      },
    });
  });
});
