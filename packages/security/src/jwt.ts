import { SignJWT, jwtVerify } from 'jose';

import type { AdminRole, SessionUser } from '@nexus/shared';

const encoder = new TextEncoder();

const getKey = (secret: string) => encoder.encode(secret);

export const signSessionToken = async (payload: SessionUser, secret: string) =>
  new SignJWT({ telegramId: payload.telegramId, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.id)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getKey(secret));

export const verifySessionToken = async (token: string, secret: string): Promise<SessionUser> => {
  const { payload } = await jwtVerify(token, getKey(secret));
  return {
    id: payload.sub ?? '',
    telegramId: String(payload.telegramId ?? ''),
    role: (payload.role ?? null) as AdminRole | null,
  };
};
