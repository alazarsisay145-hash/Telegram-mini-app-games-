import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@nexus/database', () => ({
  platformService: {
    syncTelegramUser: vi.fn().mockResolvedValue({
      user: {
        id: 'user-1',
        telegramId: '42',
        username: 'nexus-player',
        firstName: 'Nexus',
        lastName: 'Player',
        avatarUrl: null,
        status: 'ACTIVE',
      },
      wallet: {
        id: 'wallet-1',
        balance: 5000,
      },
      role: null,
    }),
  },
}));

vi.mock('@nexus/telegram', () => ({
  getTelegramUserFromInitData: vi.fn().mockReturnValue({
    id: 42,
    username: 'nexus-player',
    first_name: 'Nexus',
    last_name: 'Player',
    photo_url: 'https://example.com/avatar.png',
  }),
}));

import { createApp } from '../src/app';

let app: ReturnType<typeof createApp>;

describe('telegram auth', () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = '******localhost:5432/nexus_games?schema=public';
    process.env.TELEGRAM_BOT_TOKEN = '123456:TEST_TEST_TEST_TEST';
    process.env.TELEGRAM_WEBAPP_URL = 'http://localhost:3000';
    process.env.JWT_SECRET = 'super-secret-token-value';
    process.env.ADMIN_SECRET = 'another-super-secret';
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:4000';
    app = createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the welcome-bonus balance in the session payload', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/telegram',
      payload: { initData: 'signed-init-data' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.user.balance).toBe(5000);
    expect(body.data.user.firstName).toBe('Nexus');
    expect(body.data.token).toEqual(expect.any(String));
  });
});
