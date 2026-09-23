import type { KenoConfig } from './types';

export const RESPONSIBLE_USE_COPY =
  'Credits are virtual only for entertainment. They are not money and cannot be withdrawn or exchanged for cash.';

export const DEFAULT_WELCOME_BONUS = 5000;
export const DEFAULT_DAILY_BONUS = 750;
export const DEFAULT_KENO_CONFIG: KenoConfig = {
  gameType: 'KENO',
  enabled: true,
  minStake: 100,
  maxStake: 5000,
  payoutTable: {
    1: { 1: 3 },
    2: { 1: 1, 2: 8 },
    3: { 2: 2, 3: 12 },
    4: { 2: 1, 3: 5, 4: 25 },
    5: { 3: 3, 4: 12, 5: 60 },
    6: { 3: 2, 4: 6, 5: 20, 6: 100 },
    7: { 3: 1, 4: 4, 5: 12, 6: 35, 7: 150 },
    8: { 4: 3, 5: 10, 6: 25, 7: 80, 8: 300 },
    9: { 4: 2, 5: 6, 6: 18, 7: 50, 8: 150, 9: 500 },
    10: { 5: 5, 6: 15, 7: 40, 8: 100, 9: 300, 10: 1000 },
  },
};

export const AVAILABLE_GAMES = [
  { id: 'keno', name: 'Keno', enabled: true, description: 'Pick 1-10 numbers and match the secure draw.' },
  { id: 'dice', name: 'Dice', enabled: true, description: 'Roll against a configurable target.' },
  { id: 'number-guess', name: 'Number Guess', enabled: true, description: 'Guess the secret number to win credits.' },
] as const;
