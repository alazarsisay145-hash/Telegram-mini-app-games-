import { randomInt } from 'node:crypto';

import type { KenoInput, KenoResult } from './types';

const DRAW_COUNT = 20;

export class KenoEngine {
  validate(input: KenoInput): void {
    const unique = new Set(input.selectedNumbers);
    if (input.selectedNumbers.length < 1 || input.selectedNumbers.length > 10 || unique.size !== input.selectedNumbers.length) {
      throw new Error('INVALID_NUMBERS');
    }

    if (input.selectedNumbers.some((value) => value < 1 || value > 80)) {
      throw new Error('INVALID_NUMBERS');
    }

    if (input.stake <= 0) {
      throw new Error('INVALID_STAKE');
    }
  }

  resolve(input: KenoInput): KenoResult {
    this.validate(input);
    const drawNumbers = drawUniqueNumbers(80, DRAW_COUNT);
    const matches = input.selectedNumbers.filter((number) => drawNumbers.includes(number)).length;
    const multiplier = input.payoutTable[input.selectedNumbers.length]?.[matches] ?? 0;
    return {
      drawNumbers,
      matches,
      multiplier,
      payout: input.stake * multiplier,
    };
  }

  calculateReward(input: KenoInput, result: KenoResult): number {
    return input.stake * result.multiplier;
  }

  getResult(input: KenoInput): KenoResult {
    return this.resolve(input);
  }
}

export const drawUniqueNumbers = (max: number, count: number): number[] => {
  if (count > max) {
    throw new Error('INVALID_DRAW_CONFIGURATION');
  }

  const pool = Array.from({ length: max }, (_, index) => index + 1);
  const draw: number[] = [];

  while (draw.length < count) {
    const index = randomInt(0, pool.length);
    draw.push(pool[index]!);
    pool.splice(index, 1);
  }

  return draw.sort((left, right) => left - right);
};
