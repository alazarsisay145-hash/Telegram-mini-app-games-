'use client';

import { useState } from 'react';

import { Card, PillButton, SectionTitle } from '@nexus/ui';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export const AdminConsole = () => {
  const [token, setToken] = useState('');
  const [dashboard, setDashboard] = useState<Record<string, string | number> | null>(null);
  const [users, setUsers] = useState<
    Array<{
      id: string;
      firstName: string;
      lastName?: string | null;
      telegramId: string;
      status: string;
      wallet?: { balance: number } | null;
    }>
  >([]);
  const [message, setMessage] = useState('Enter an admin JWT issued by the API to load protected data.');

  const headers = token ? { Authorization: 'Bearer ' + token } : undefined;

  const load = async () => {
    if (!headers) return;
    const [dashboardResponse, usersResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/api/admin/dashboard`, { headers }),
      fetch(`${apiBaseUrl}/api/admin/users`, { headers }),
    ]);
    const dashboardPayload = await dashboardResponse.json();
    const usersPayload = await usersResponse.json();
    if (!dashboardPayload.success) {
      setMessage(dashboardPayload.error.message);
      return;
    }
    setDashboard(dashboardPayload.data);
    setUsers(usersPayload.data ?? []);
    setMessage('Protected admin data loaded.');
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 px-4 py-8">
      <Card>
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Admin dashboard</p>
        <h1 className="mt-2 text-3xl font-black text-white">NEXUS GAMES Control Center</h1>
        <p className="mt-2 text-sm text-slate-300">{message}</p>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste admin JWT"
            className="min-h-12 flex-1 rounded-full border border-white/10 bg-white/5 px-4 text-white outline-none"
          />
          <PillButton className="md:w-48" onClick={load}>
            Load dashboard
          </PillButton>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {dashboard
          ? Object.entries(dashboard).map(([key, value]) => (
              <Card key={key}>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{key}</p>
                <p className="mt-2 text-2xl font-bold text-white">{String(value)}</p>
              </Card>
            ))
          : ['totalUsers', 'activeUsers', 'gamesPlayed'].map((key) => (
              <Card key={key}>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{key}</p>
                <p className="mt-2 text-2xl font-bold text-white">—</p>
              </Card>
            ))}
      </div>

      <Card>
        <SectionTitle>Users</SectionTitle>
        <div className="mt-3 space-y-2">
          {users.length > 0 ? (
            users.map((user) => (
              <div key={user.id} className="rounded-2xl bg-white/5 p-3 text-sm text-slate-300">
                <div className="flex items-center justify-between text-white">
                  <span>{user.firstName} {user.lastName ?? ''}</span>
                  <span>{user.status}</span>
                </div>
                <p className="mt-1">Telegram ID: {user.telegramId} · Balance: {user.wallet?.balance?.toLocaleString?.() ?? 0} credits</p>
              </div>
            ))
          ) : (
            <p className="rounded-2xl bg-white/5 p-4 text-sm text-slate-400">No users loaded yet.</p>
          )}
        </div>
      </Card>
    </main>
  );
};
