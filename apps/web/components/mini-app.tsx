'use client';

import { useEffect, useMemo, useState } from 'react';

import { AVAILABLE_GAMES, RESPONSIBLE_USE_COPY } from '@nexus/shared';
import { Card, PillButton, SectionTitle } from '@nexus/ui';

type Session = {
  token: string;
  user: {
    firstName: string;
    balance: number;
  };
};

type HistoryItem = {
  gameId: string;
  stake: number;
  payout: number;
  matches: number;
  status: string;
  createdAt: string;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready: () => void;
      };
    };
  }
}

const numberOptions = Array.from({ length: 80 }, (_, index) => index + 1);
const stakeOptions = [100, 500, 1000];
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export const MiniApp = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [stake, setStake] = useState(100);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [bonusStatus, setBonusStatus] = useState<{ amount: number; canClaim: boolean; nextClaimAt: string | null } | null>(null);
  const [message, setMessage] = useState('Authenticate from Telegram to start playing.');
  const [loading, setLoading] = useState(false);

  const selectedCountLabel = `${selected.length} / 10`;

  const authHeaders = useMemo(
    () =>
      session
        ? {
            Authorization: 'Bearer ' + session.token,
          }
        : undefined,
    [session],
  );

  useEffect(() => {
    const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '';
    if (!initData) {
      setMessage('Open the Mini App from Telegram to authenticate securely.');
      return;
    }

    window.Telegram?.WebApp?.ready();

    const authenticate = async () => {
      const response = await fetch(`${apiBaseUrl}/api/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });
      const payload = await response.json();
      if (!payload.success) {
        setMessage(payload.error.message);
        return;
      }
      setSession(payload.data);
      setMessage(`Welcome back, ${payload.data.user.firstName}.`);
    };

    authenticate().catch(() => setMessage('Authentication failed. Please try again from Telegram.'));
  }, []);

  useEffect(() => {
    if (!authHeaders) return;
    fetch(`${apiBaseUrl}/api/me/history`, { headers: authHeaders })
      .then((response) => response.json())
      .then((payload) => {
        if (payload.success) setHistory(payload.data.items);
      })
      .catch(() => undefined);

    fetch(`${apiBaseUrl}/api/bonus`, { headers: authHeaders })
      .then((response) => response.json())
      .then((payload) => {
        if (payload.success) setBonusStatus(payload.data);
      })
      .catch(() => undefined);
  }, [authHeaders]);

  const toggleNumber = (value: number) => {
    setSelected((current) => {
      if (current.includes(value)) return current.filter((item) => item !== value);
      if (current.length >= 10) return current;
      return [...current, value].sort((left, right) => left - right);
    });
  };

  const playKeno = async () => {
    if (!authHeaders) return;
    setLoading(true);
    setMessage('Drawing secure numbers...');
    try {
      const response = await fetch(`${apiBaseUrl}/api/games/keno/play`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({ stake, selectedNumbers: selected }),
      });
      const payload = await response.json();
      if (!payload.success) {
        setMessage(payload.error.message);
        return;
      }
      setMessage(`Matches: ${payload.data.game.matches}. Reward: ${payload.data.game.payout.toLocaleString()} credits.`);
      setSession((current) => (current ? { ...current, user: { ...current.user, balance: payload.data.balance } } : current));
      const historyResponse = await fetch(`${apiBaseUrl}/api/me/history`, { headers: authHeaders });
      const historyPayload = await historyResponse.json();
      if (historyPayload.success) setHistory(historyPayload.data.items);
    } finally {
      setLoading(false);
    }
  };

  const claimBonus = async () => {
    if (!authHeaders) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/bonus/claim`, {
        method: 'POST',
        headers: { ...authHeaders, 'Idempotency-Key': crypto.randomUUID() },
      });
      const payload = await response.json();
      if (!payload.success) {
        setMessage(payload.error.message);
        return;
      }
      setMessage(`Daily bonus claimed: ${payload.data.amount.toLocaleString()} credits.`);
      setSession((current) => (current ? { ...current, user: { ...current.user, balance: payload.data.balance } } : current));
      setBonusStatus({ amount: payload.data.amount, canClaim: false, nextClaimAt: payload.data.nextClaimAt });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-4 py-6">
      <Card className="bg-slate-950/70">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Telegram Mini App</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">NEXUS GAMES</h1>
        <p className="mt-2 text-sm text-slate-300">{message}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/5 p-3">
            <p className="text-xs text-slate-400">Balance</p>
            <p className="mt-1 text-2xl font-bold text-white">{session?.user.balance?.toLocaleString() ?? '—'} credits</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-3">
            <p className="text-xs text-slate-400">Daily bonus</p>
            <p className="mt-1 text-sm text-white">{bonusStatus ? `${bonusStatus.amount.toLocaleString()} credits` : 'Connect to load'}</p>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>KENO</SectionTitle>
        <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
          <span>Selected count</span>
          <span>{selectedCountLabel}</span>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {numberOptions.map((value) => {
            const active = selected.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleNumber(value)}
                className={`min-h-12 rounded-2xl border text-sm font-semibold ${active ? 'border-cyan-300 bg-cyan-300 text-slate-950' : 'border-white/10 bg-white/5 text-white'}`}
              >
                {String(value).padStart(2, '0')}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex gap-2">
          {stakeOptions.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStake(value)}
              className={`min-h-11 flex-1 rounded-full border px-3 text-sm font-semibold ${stake === value ? 'border-cyan-300 bg-cyan-300 text-slate-950' : 'border-white/10 bg-white/5 text-white'}`}
            >
              {value.toLocaleString()}
            </button>
          ))}
        </div>
        <PillButton className="mt-4 w-full" onClick={playKeno}>
          {loading ? 'Drawing...' : 'Play Keno'}
        </PillButton>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle>Games</SectionTitle>
          <span className="text-xs text-slate-400">Virtual credits only</span>
        </div>
        <div className="mt-3 space-y-2">
          {AVAILABLE_GAMES.map((game) => (
            <div key={game.id} className="rounded-2xl bg-white/5 p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-white">{game.name}</p>
                <span className="text-xs text-cyan-300">{game.enabled ? 'LIVE' : 'OFFLINE'}</span>
              </div>
              <p className="mt-1 text-sm text-slate-300">{game.description}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle>Daily Bonus</SectionTitle>
          <button type="button" className="text-sm font-semibold text-cyan-300" onClick={claimBonus}>
            Claim now
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-300">One claim per UTC day. Server time controls eligibility.</p>
        <p className="mt-2 text-xs text-slate-400">{bonusStatus?.nextClaimAt ? `Next claim window resets by ${bonusStatus.nextClaimAt}` : RESPONSIBLE_USE_COPY}</p>
      </Card>

      <Card>
        <SectionTitle>History</SectionTitle>
        <div className="mt-3 space-y-2">
          {history.length > 0 ? (
            history.map((item) => (
              <div key={item.gameId} className="rounded-2xl bg-white/5 p-3 text-sm text-slate-300">
                <div className="flex items-center justify-between text-white">
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                  <span>{item.status}</span>
                </div>
                <p className="mt-1">Stake {item.stake.toLocaleString()} credits · Reward {item.payout.toLocaleString()} credits · Matches {item.matches}</p>
              </div>
            ))
          ) : (
            <p className="rounded-2xl bg-white/5 p-4 text-sm text-slate-400">No game history yet.</p>
          )}
        </div>
      </Card>

      <nav className="sticky bottom-3 grid grid-cols-5 gap-2 rounded-full border border-white/10 bg-slate-950/80 p-2 text-center text-xs text-slate-300 backdrop-blur">
        {['Home', 'Games', 'Wallet', 'History', 'Profile'].map((label) => (
          <span key={label} className="rounded-full px-2 py-3 first:bg-cyan-300 first:text-slate-950">
            {label}
          </span>
        ))}
      </nav>
    </main>
  );
};
