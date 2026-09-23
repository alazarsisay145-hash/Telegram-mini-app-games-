import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';

let app: ReturnType<typeof createApp>;

describe('health endpoints', () => {
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

  it('returns a healthy status', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ success: true, data: { status: 'ok' }, error: null });
  });
});
