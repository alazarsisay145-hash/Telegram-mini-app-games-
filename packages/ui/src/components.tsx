import type { PropsWithChildren } from 'react';
import clsx from 'clsx';

export const Card = ({ children, className }: PropsWithChildren<{ className?: string }>) => (
  <div className={clsx('rounded-3xl border border-white/10 bg-slate-900/60 p-4 shadow-lg shadow-slate-950/30', className)}>{children}</div>
);

export const SectionTitle = ({ children }: PropsWithChildren) => (
  <h2 className="text-lg font-semibold tracking-tight text-white">{children}</h2>
);

export const PillButton = ({
  children,
  className,
  onClick,
  type = 'button',
}: PropsWithChildren<{
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}>) => (
  <button
    onClick={onClick}
    type={type}
    className={clsx(
      'flex min-h-12 items-center justify-center rounded-full bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 active:scale-[0.99]',
      className,
    )}
  >
    {children}
  </button>
);
