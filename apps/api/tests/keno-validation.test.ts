import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@nexus/database', () => ({
  platformService: {
    playKeno: vi.fn(),
  },
}));

import { createApp } from '../src/app';
import { signSessionToken } from '@nexus/security';

let app: ReturnType<typeof createApp>;

describe('keno input validation', () => {
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

  it('rejects empty Keno selections with a validation error response', async () => {
    const token = await signSessionToken({ id: 'user-1', telegramId: '42', role: null }, process.env.JWT_SECRET!);
    const response = await app.inject({
      method: 'POST',
      url: '/api/games/keno/play',
      headers: {
        authorization: 'Bearer ' + token,
        'idempotency-key': 'keno-empty-selection',
      },
      payload: { stake: 100, selectedNumbers: [] },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      success: false,
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Too small: expected array to have >=1 items',
      },
    });
  });
});
