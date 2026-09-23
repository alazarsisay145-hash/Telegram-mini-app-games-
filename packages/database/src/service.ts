import { Prisma, UserStatus, type ReferenceType, type WalletTransactionType } from '@prisma/client';
import { DEFAULT_DAILY_BONUS, DEFAULT_KENO_CONFIG, DEFAULT_WELCOME_BONUS, type AdminRole, type DailyBonusStatus, type HistoryItem, type KenoConfig, type SessionUser } from '@nexus/shared';
import { KenoEngine } from '@nexus/game-engine';

import { prisma } from './client';

const utcDateKey = (date = new Date()) => date.toISOString().slice(0, 10);

const leaderboardPeriodKey = (window: string, date = new Date()) => {
  if (window === 'all-time') return 'all-time';
  if (window === 'monthly') return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  if (window === 'weekly') {
    const first = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const days = Math.floor((date.getTime() - first.getTime()) / 86400000);
    return `${date.getUTCFullYear()}-W${String(Math.ceil((days + first.getUTCDay() + 1) / 7)).padStart(2, '0')}`;
  }
  return utcDateKey(date);
};

const createWalletTransaction = async (
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    walletId: string;
    type: WalletTransactionType;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    referenceType: ReferenceType;
    referenceId: string;
    description: string;
  },
) =>
  tx.walletTransaction.create({
    data: {
      transactionId: crypto.randomUUID(),
      ...params,
    },
  });

const getOrCreateKenoConfig = async (tx: Prisma.TransactionClient | PrismaClientLike): Promise<KenoConfig> => {
  const config = await tx.gameConfig.upsert({
    where: { gameType: 'KENO' },
    update: {},
    create: {
      gameType: 'KENO',
      enabled: DEFAULT_KENO_CONFIG.enabled,
      config: DEFAULT_KENO_CONFIG as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    gameType: 'KENO',
    enabled: config.enabled,
    ...(config.config as Omit<KenoConfig, 'enabled' | 'gameType'>),
  };
};

type PrismaClientLike = Pick<
  typeof prisma,
  'gameConfig' | 'wallet' | 'walletTransaction' | 'game' | 'dailyBonus' | 'user' | 'adminUser' | 'auditLog' | 'leaderboardEntry'
>;

export class PlatformService {
  private readonly kenoEngine = new KenoEngine();

  async syncTelegramUser(profile: {
    telegramId: string;
    username?: string;
    firstName: string;
    lastName?: string;
    avatarUrl?: string;
  }) {
    return prisma.$transaction(
      async (tx) => {
        const user = await tx.user.upsert({
          where: { telegramId: profile.telegramId },
          update: {
            username: profile.username,
            firstName: profile.firstName,
            lastName: profile.lastName,
            avatarUrl: profile.avatarUrl,
            lastSeenAt: new Date(),
          },
          create: {
            telegramId: profile.telegramId,
            username: profile.username,
            firstName: profile.firstName,
            lastName: profile.lastName,
            avatarUrl: profile.avatarUrl,
            lastSeenAt: new Date(),
          },
        });

        const wallet = await tx.wallet.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            balance: DEFAULT_WELCOME_BONUS,
          },
        });

        const existingBonus = await tx.walletTransaction.findFirst({
          where: { userId: user.id, type: 'WELCOME_BONUS' },
        });

        if (!existingBonus) {
          await createWalletTransaction(tx, {
            userId: user.id,
            walletId: wallet.id,
            type: 'WELCOME_BONUS',
            amount: DEFAULT_WELCOME_BONUS,
            balanceBefore: 0,
            balanceAfter: DEFAULT_WELCOME_BONUS,
            referenceType: 'SYSTEM',
            referenceId: user.id,
            description: 'Welcome bonus credits',
          });
        }

        const admin = await tx.adminUser.findUnique({ where: { userId: user.id } });

        return {
          user,
          wallet,
          role: admin?.role ?? null,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { wallet: true, adminUser: true } });
    if (!user) throw new Error('USER_NOT_FOUND');
    return user;
  }

  async getBalance(userId: string) {
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error('USER_NOT_FOUND');
    return wallet.balance;
  }

  async getHistory(userId: string, page: number, limit: number) {
    const games = await prisma.game.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return games.map<HistoryItem>((game) => ({
      gameId: game.id,
      gameType: game.gameType,
      stake: game.stake,
      selectedNumbers: game.selectedNumbers,
      drawNumbers: game.drawNumbers,
      matches: game.matches,
      payout: game.payout,
      status: game.status,
      createdAt: game.createdAt.toISOString(),
      completedAt: game.completedAt?.toISOString() ?? null,
    }));
  }

  async getKenoConfig() {
    return getOrCreateKenoConfig(prisma);
  }

  async playKeno(params: {
    userId: string;
    stake: number;
    selectedNumbers: number[];
    idempotencyKey: string;
  }) {
    return prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({ where: { id: params.userId }, include: { wallet: true } });
        if (!user?.wallet) throw new Error('USER_NOT_FOUND');
        if (user.status !== UserStatus.ACTIVE) throw new Error('FORBIDDEN');

        const existingGame = await tx.game.findUnique({
          where: { userId_idempotencyKey: { userId: params.userId, idempotencyKey: params.idempotencyKey } },
        });
        if (existingGame) {
          if (existingGame.status === 'COMPLETED') {
            return existingGame;
          }
          throw new Error('GAME_ALREADY_COMPLETED');
        }

        const config = await getOrCreateKenoConfig(tx);
        if (!config.enabled) throw new Error('FORBIDDEN');
        if (params.stake < config.minStake || params.stake > config.maxStake) throw new Error('INVALID_STAKE');

        this.kenoEngine.validate({ stake: params.stake, selectedNumbers: params.selectedNumbers, payoutTable: config.payoutTable });

        const stakeUpdate = await tx.wallet.updateMany({
          where: { id: user.wallet.id, balance: { gte: params.stake } },
          data: { balance: { decrement: params.stake } },
        });

        if (stakeUpdate.count !== 1) throw new Error('INSUFFICIENT_CREDITS');

        const walletAfterStake = await tx.wallet.findUniqueOrThrow({ where: { id: user.wallet.id } });

        await createWalletTransaction(tx, {
          userId: user.id,
          walletId: user.wallet.id,
          type: 'GAME_STAKE',
          amount: -params.stake,
          balanceBefore: walletAfterStake.balance + params.stake,
          balanceAfter: walletAfterStake.balance,
          referenceType: 'GAME',
          referenceId: params.idempotencyKey,
          description: 'Keno stake deduction',
        });

        const result = this.kenoEngine.resolve({
          stake: params.stake,
          selectedNumbers: params.selectedNumbers,
          payoutTable: config.payoutTable,
        });

        const game = await tx.game.create({
          data: {
            userId: user.id,
            gameType: 'KENO',
            stake: params.stake,
            selectedNumbers: [...params.selectedNumbers].sort((a, b) => a - b),
            drawNumbers: result.drawNumbers,
            matches: result.matches,
            payout: result.payout,
            status: 'COMPLETED',
            idempotencyKey: params.idempotencyKey,
            completedAt: new Date(),
          },
        });

        if (result.payout > 0) {
          const rewardedWallet = await tx.wallet.update({
            where: { id: user.wallet.id },
            data: { balance: { increment: result.payout } },
          });

          await createWalletTransaction(tx, {
            userId: user.id,
            walletId: user.wallet.id,
            type: 'GAME_REWARD',
            amount: result.payout,
            balanceBefore: rewardedWallet.balance - result.payout,
            balanceAfter: rewardedWallet.balance,
            referenceType: 'GAME',
            referenceId: game.id,
            description: 'Keno reward credit',
          });
        }

        const finalWallet = await tx.wallet.findUniqueOrThrow({ where: { id: user.wallet.id } });
        await this.refreshLeaderboards(tx, user.id);

        return {
          game,
          balance: finalWallet.balance,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async getGameForUser(userId: string, gameId: string) {
    const game = await prisma.game.findFirst({ where: { id: gameId, userId } });
    if (!game) throw new Error('GAME_NOT_FOUND');
    return game;
  }

  async getDailyBonusStatus(userId: string): Promise<DailyBonusStatus> {
    const today = utcDateKey();
    const reward = await this.getDailyBonusAmount();
    const existing = await prisma.dailyBonus.findUnique({ where: { userId_claimDate: { userId, claimDate: today } } });
    return {
      amount: reward,
      canClaim: !existing,
      nextClaimAt: existing ? new Date(`${today}T23:59:59.999Z`).toISOString() : null,
    };
  }

  async claimDailyBonus(userId: string, idempotencyKey: string) {
    return prisma.$transaction(
      async (tx) => {
        const today = utcDateKey();
        const wallet = await tx.wallet.findUnique({ where: { userId } });
        if (!wallet) throw new Error('USER_NOT_FOUND');

        const duplicate = await tx.dailyBonus.findFirst({ where: { userId, idempotencyKey } });
        if (duplicate) {
          return this.getDailyBonusStatus(userId);
        }

        const existing = await tx.dailyBonus.findUnique({ where: { userId_claimDate: { userId, claimDate: today } } });
        if (existing) throw new Error('FORBIDDEN');

        const amount = await this.getDailyBonusAmount(tx);
        await tx.dailyBonus.create({ data: { userId, amount, claimDate: today, idempotencyKey } });
        const updatedWallet = await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } });

        await createWalletTransaction(tx, {
          userId,
          walletId: wallet.id,
          type: 'DAILY_BONUS',
          amount,
          balanceBefore: updatedWallet.balance - amount,
          balanceAfter: updatedWallet.balance,
          referenceType: 'BONUS',
          referenceId: today,
          description: 'Daily bonus claim',
        });

        await this.refreshLeaderboards(tx, userId);

        return {
          amount,
          balance: updatedWallet.balance,
          nextClaimAt: new Date(`${today}T23:59:59.999Z`).toISOString(),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async getLeaderboard(window: 'daily' | 'weekly' | 'monthly' | 'all-time') {
    const periodKey = leaderboardPeriodKey(window);
    return prisma.leaderboardEntry.findMany({
      where: { window, periodKey },
      orderBy: { score: 'desc' },
      take: 25,
      include: { user: { select: { username: true, firstName: true } } },
    });
  }

  async getAdminDashboard() {
    const [totalUsers, activeUsers, gamesPlayed, ledger, dau] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.game.count(),
      prisma.walletTransaction.groupBy({ by: ['type'], _sum: { amount: true } }),
      prisma.user.count({ where: { lastSeenAt: { gte: new Date(Date.now() - 86400000) } } }),
    ]);

    const creditsIssued = ledger
      .filter((row) => ['WELCOME_BONUS', 'DAILY_BONUS', 'PROMO_GRANT', 'ADMIN_GRANT'].includes(row.type))
      .reduce((sum, row) => sum + (row._sum.amount ?? 0), 0);
    const creditsSpent = Math.abs(
      ledger.filter((row) => row.type === 'GAME_STAKE').reduce((sum, row) => sum + (row._sum.amount ?? 0), 0),
    );
    const creditsRewarded = ledger
      .filter((row) => row.type === 'GAME_REWARD')
      .reduce((sum, row) => sum + (row._sum.amount ?? 0), 0);

    return { totalUsers, activeUsers, gamesPlayed, creditsIssued, creditsSpent, creditsRewarded, dau };
  }

  async listUsers(query?: string) {
    return prisma.user.findMany({
      where: query
        ? {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { firstName: { contains: query, mode: 'insensitive' } },
              { telegramId: { contains: query } },
            ],
          }
        : undefined,
      include: { wallet: true, adminUser: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getAdminUserDetail(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        adminUser: true,
        games: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!user) throw new Error('USER_NOT_FOUND');
    return user;
  }

  async updateUserStatus(actor: SessionUser, targetUserId: string, status: UserStatus) {
    const user = await prisma.user.update({ where: { id: targetUserId }, data: { status } });
    await prisma.auditLog.create({
      data: {
        actorUserId: actor.id,
        targetId: targetUserId,
        action: 'admin.user.status.updated',
        metadata: { status },
      },
    });
    return user;
  }

  async listGameConfigs() {
    const configs = await prisma.gameConfig.findMany({ orderBy: { gameType: 'asc' } });
    if (configs.length === 0) {
      await getOrCreateKenoConfig(prisma);
      return prisma.gameConfig.findMany({ orderBy: { gameType: 'asc' } });
    }
    return configs;
  }

  async updateKenoConfig(actor: SessionUser, input: Partial<KenoConfig> & { dailyBonusAmount?: number }) {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await getOrCreateKenoConfig(tx);
      const nextConfig = {
        ...current,
        enabled: input.enabled ?? current.enabled,
        minStake: input.minStake ?? current.minStake,
        maxStake: input.maxStake ?? current.maxStake,
        payoutTable: input.payoutTable ?? current.payoutTable,
      };

      const config = await tx.gameConfig.upsert({
        where: { gameType: 'KENO' },
        update: { enabled: nextConfig.enabled, config: nextConfig },
        create: { gameType: 'KENO', enabled: nextConfig.enabled, config: nextConfig },
      });

      if (typeof input.dailyBonusAmount === 'number') {
        await tx.gameConfig.upsert({
          where: { gameType: 'DICE' },
          update: { config: { dailyBonusAmount: input.dailyBonusAmount } },
          create: { gameType: 'DICE', enabled: true, config: { dailyBonusAmount: input.dailyBonusAmount } },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          targetId: config.id,
          action: 'admin.keno.config.updated',
          metadata: { nextConfig, dailyBonusAmount: input.dailyBonusAmount ?? null },
        },
      });

      return nextConfig;
    });

    return updated;
  }

  async listAuditLogs() {
    return prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async getAdminRole(userId: string): Promise<AdminRole | null> {
    const admin = await prisma.adminUser.findUnique({ where: { userId } });
    return admin?.role ?? null;
  }

  private async getDailyBonusAmount(tx: PrismaClientLike = prisma) {
    const config = await tx.gameConfig.findUnique({ where: { gameType: 'DICE' } });
    const amount = Number((config?.config as { dailyBonusAmount?: number } | null)?.dailyBonusAmount ?? DEFAULT_DAILY_BONUS);
    return Number.isFinite(amount) ? amount : DEFAULT_DAILY_BONUS;
  }

  private async refreshLeaderboards(tx: Prisma.TransactionClient, userId: string) {
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
    for (const window of ['daily', 'weekly', 'monthly', 'all-time'] as const) {
      await tx.leaderboardEntry.upsert({
        where: { userId_window_periodKey: { userId, window, periodKey: leaderboardPeriodKey(window) } },
        update: { score: wallet.balance },
        create: { userId, window, periodKey: leaderboardPeriodKey(window), score: wallet.balance },
      });
    }
  }
}

export const platformService = new PlatformService();
