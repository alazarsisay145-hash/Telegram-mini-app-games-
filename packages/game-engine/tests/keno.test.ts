import { describe, expect, it } from 'vitest';

import { KenoEngine, drawUniqueNumbers } from '../src/keno';

const engine = new KenoEngine();
const payoutTable = { 3: { 2: 2, 3: 12 } };

describe('KenoEngine', () => {
  it('rejects duplicate numbers', () => {
    expect(() =>
      engine.validate({ stake: 100, selectedNumbers: [1, 1, 2], payoutTable }),
    ).toThrowError('INVALID_NUMBERS');
  });

  it('generates 20 unique draw numbers', () => {
    const draw = drawUniqueNumbers(80, 20);
    expect(draw).toHaveLength(20);
    expect(new Set(draw).size).toBe(20);
    expect(Math.min(...draw)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...draw)).toBeLessThanOrEqual(80);
  });

  it('calculates payout from the configured table', () => {
    const result = { drawNumbers: [1, 2, 5], matches: 2, multiplier: 2, payout: 200 };
    expect(engine.calculateReward({ stake: 100, selectedNumbers: [1, 2, 3], payoutTable }, result)).toBe(200);
  });
});
