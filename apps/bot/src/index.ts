import { Bot, InlineKeyboard } from 'grammy';

import { platformService } from '@nexus/database';
import { RESPONSIBLE_USE_COPY } from '@nexus/shared';
import { getEnv } from '@nexus/security';
import { buildGameMenuMessage, buildHistoryMessage } from '@nexus/telegram';

const env = getEnv();
const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
const requests = new Map<number, number>();

const withRateLimit = async (userId: number, action: () => Promise<void>) => {
  const now = Date.now();
  const last = requests.get(userId) ?? 0;
  if (now - last < 800) {
    return false;
  }

  requests.set(userId, now);
  await action();
  return true;
};

const upsertTelegramUser = async (ctx: Parameters<typeof bot.command>[1] extends never ? never : any) => {
  const from = ctx.from;
  if (!from) {
    throw new Error('AUTH_INVALID');
  }

  return platformService.syncTelegramUser({
    telegramId: String(from.id),
    username: from.username,
    firstName: from.first_name,
    lastName: from.last_name,
    avatarUrl: undefined,
  });
};

const appKeyboard = () => new InlineKeyboard().url('Open NEXUS GAMES', env.TELEGRAM_WEBAPP_URL);

bot.command('start', async (ctx) => {
  await withRateLimit(ctx.from!.id, async () => {
    const session = await upsertTelegramUser(ctx);
    await ctx.reply(buildGameMenuMessage(session.wallet.balance), { reply_markup: appKeyboard() });
  });
});

bot.command('help', async (ctx) => {
  await ctx.reply(`Commands: /start /help /profile /games /keno /balance /history /leaderboard /bonus /support\n\n${RESPONSIBLE_USE_COPY}`);
});

bot.command(['profile', 'balance'], async (ctx) => {
  const session = await upsertTelegramUser(ctx);
  await ctx.reply(`Player: ${session.user.firstName}\nBalance: ${session.wallet.balance.toLocaleString()} credits\nStatus: ${session.user.status}`);
});

bot.command(['games', 'keno'], async (ctx) => {
  const balance = await platformService.getBalance((await upsertTelegramUser(ctx)).user.id);
  await ctx.reply(buildGameMenuMessage(balance), { reply_markup: appKeyboard() });
});

bot.command('history', async (ctx) => {
  const session = await upsertTelegramUser(ctx);
  const history = await platformService.getHistory(session.user.id, 1, 5);
  await ctx.reply(
    buildHistoryMessage(
      history.map((game) => `${game.gameType}: stake ${game.stake} credits, payout ${game.payout} credits, matches ${game.matches}`),
    ),
  );
});

bot.command('leaderboard', async (ctx) => {
  const board = await platformService.getLeaderboard('daily');
  const lines = board.map((entry, index) => `${index + 1}. ${entry.user?.username ?? entry.user?.firstName ?? 'Player'} — ${entry.score.toLocaleString()} credits`);
  await ctx.reply(lines.length > 0 ? lines.join('\n') : 'Leaderboard is empty right now.');
});

bot.command('bonus', async (ctx) => {
  const session = await upsertTelegramUser(ctx);
  const status = await platformService.getDailyBonusStatus(session.user.id);
  await ctx.reply(
    status.canClaim
      ? `Daily bonus ready: ${status.amount.toLocaleString()} credits. Claim it in the Mini App.`
      : `Bonus already claimed. Next claim unlocks at ${status.nextClaimAt}.`,
  );
});

bot.command('support', async (ctx) => {
  await ctx.reply(`Support: use the in-app help section for account and gameplay assistance.\n\n${RESPONSIBLE_USE_COPY}`);
});

bot.on('message:text', async (ctx, next) => {
  if (ctx.message.text.startsWith('/')) {
    await ctx.reply('Unknown command. Use /help to see the supported commands.');
    return;
  }
  await next();
});

bot.catch((error) => {
  console.error('Bot error', error.error);
});

bot.start();
