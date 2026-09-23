import { randomInt } from 'node:crypto';

export const playNumberGuess = (stake: number, guess: number) => {
  if (stake <= 0 || guess < 1 || guess > 5) {
    throw new Error('INVALID_STAKE');
  }

  const answer = randomInt(1, 6);
  return {
    answer,
    payout: answer === guess ? stake * 5 : 0,
  };
};
