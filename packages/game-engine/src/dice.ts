import { randomInt } from 'node:crypto';

export const playDice = (stake: number) => {
  if (stake <= 0) {
    throw new Error('INVALID_STAKE');
  }

  const roll = randomInt(1, 7);
  const payout = roll >= 5 ? stake * 2 : 0;
  return { roll, payout };
};
