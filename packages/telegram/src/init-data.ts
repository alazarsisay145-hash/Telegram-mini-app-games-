import { createHmac } from 'node:crypto';

const parseInitData = (initData: string): URLSearchParams => new URLSearchParams(initData);

export const verifyTelegramInitData = (initData: string, botToken: string): Record<string, string> => {
  const params = parseInitData(initData);
  const hash = params.get('hash');

  if (!hash) {
    throw new Error('AUTH_INVALID');
  }

  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const signature = createHmac('sha256', secret).update(dataCheckString).digest('hex');

  if (signature !== hash) {
    throw new Error('AUTH_INVALID');
  }

  return Object.fromEntries(params.entries());
};

export const getTelegramUserFromInitData = (initData: string, botToken: string) => {
  const verified = verifyTelegramInitData(initData, botToken);
  const rawUser = verified.user;

  if (!rawUser) {
    throw new Error('AUTH_INVALID');
  }

  return JSON.parse(rawUser) as {
    id: number;
    username?: string;
    first_name: string;
    last_name?: string;
    photo_url?: string;
  };
};
