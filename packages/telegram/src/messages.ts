import { RESPONSIBLE_USE_COPY } from '@nexus/shared';

export const buildGameMenuMessage = (balance: number) =>
  [`NEXUS GAMES`, `Balance: ${balance.toLocaleString()} credits`, '', RESPONSIBLE_USE_COPY].join('\n');

export const buildHistoryMessage = (lines: string[]) =>
  lines.length > 0 ? lines.join('\n') : 'No games played yet. Try Keno to build your history.';
