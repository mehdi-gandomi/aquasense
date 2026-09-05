'use client';

import clsx from 'clsx';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

/** Soft SaaS primitives — used in both Soft and Brutal admin shells (cards stay readable on dark chrome). */

export function AdminPageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-tight text-slate-800 dark:text-slate-100 [.admin-app[data-admin-look=brutal]_&]:text-slate-100">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[13px] text-slate-500 [.admin-app[data-admin-look=brutal]_&]:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function AdminCard({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={clsx(
        'overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(15,40,60,0.06)]',
        '[.admin-app[data-admin-look=brutal]_&]:rounded-none [.admin-app[data-admin-look=brutal]_&]:border-2 [.admin-app[data-admin-look=brutal]_&]:border-line [.admin-app[data-admin-look=brutal]_&]:bg-shell-900 [.admin-app[data-admin-look=brutal]_&]:shadow-none',
        padded && 'p-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminCardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-500 [.admin-app[data-admin-look=brutal]_&]:text-slate-400">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function AdminStat({
  label,
  value,
  hint,
  tone = 'cyan',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'cyan' | 'mint' | 'amber' | 'rose' | 'slate';
}) {
  const tones = {
    cyan: 'from-cyan-50 to-white text-cyan-700 ring-cyan-100',
    mint: 'from-emerald-50 to-white text-emerald-700 ring-emerald-100',
    amber: 'from-amber-50 to-white text-amber-700 ring-amber-100',
    rose: 'from-rose-50 to-white text-rose-700 ring-rose-100',
    slate: 'from-slate-50 to-white text-slate-700 ring-slate-100',
  } as const;

  return (
    <div
      className={clsx(
        'rounded-2xl bg-gradient-to-br p-4 ring-1',
        tones[tone],
        '[.admin-app[data-admin-look=brutal]_&]:rounded-none [.admin-app[data-admin-look=brutal]_&]:bg-none [.admin-app[data-admin-look=brutal]_&]:bg-shell-900 [.admin-app[data-admin-look=brutal]_&]:text-white [.admin-app[data-admin-look=brutal]_&]:ring-0 [.admin-app[data-admin-look=brutal]_&]:border-2 [.admin-app[data-admin-look=brutal]_&]:border-line',
      )}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">{label}</div>
      <div className="mt-2 text-[26px] font-semibold leading-none tracking-tight">{value}</div>
      {hint && <div className="mt-2 text-[12px] opacity-70">{hint}</div>}
    </div>
  );
}

export function AdminButton({
  children,
  tone = 'default',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'default' | 'primary' | 'danger' | 'ghost';
}) {
  const tones = {
    default: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    primary: 'border-transparent bg-cyan-600 text-white hover:bg-cyan-500',
    danger: 'border-transparent bg-rose-500 text-white hover:bg-rose-400',
    ghost: 'border-transparent bg-transparent text-slate-600 hover:bg-slate-100',
  } as const;

  return (
    <button
      type="button"
      className={clsx(
        'inline-flex items-center justify-center rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50',
        tones[tone],
        '[.admin-app[data-admin-look=brutal]_&]:rounded-none [.admin-app[data-admin-look=brutal]_&]:border-2 [.admin-app[data-admin-look=brutal]_&]:uppercase [.admin-app[data-admin-look=brutal]_&]:tracking-[0.14em] [.admin-app[data-admin-look=brutal]_&]:text-[10px]',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function AdminField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="mb-2.5 block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 [.admin-app[data-admin-look=brutal]_&]:text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-800 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100 [.admin-app[data-admin-look=brutal]_&]:rounded-none [.admin-app[data-admin-look=brutal]_&]:border-2 [.admin-app[data-admin-look=brutal]_&]:border-line [.admin-app[data-admin-look=brutal]_&]:bg-shell-950 [.admin-app[data-admin-look=brutal]_&]:text-slate-100 [.admin-app[data-admin-look=brutal]_&]:focus:border-flow [.admin-app[data-admin-look=brutal]_&]:focus:ring-0';

export function AdminInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(fieldClass, props.className)} />;
}

export function AdminSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx(fieldClass, props.className)} />;
}

export function AdminTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx(fieldClass, props.className)} />;
}

export function AdminRow({
  children,
  onClick,
  active,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0',
        '[.admin-app[data-admin-look=brutal]_&]:border-line',
        onClick && 'hover:bg-slate-50 [.admin-app[data-admin-look=brutal]_&]:hover:bg-shell-800',
        active && 'bg-cyan-50/70 [.admin-app[data-admin-look=brutal]_&]:bg-flow/10',
      )}
    >
      {children}
    </Tag>
  );
}
