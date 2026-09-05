'use client';

import type { ReactNode } from 'react';
import clsx from 'clsx';

/** Shared SCADA / admin chart chrome — Recharts fills the body. */
export function ChartFrame({
  title,
  subtitle,
  actions,
  children,
  className,
  height = 220,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  height?: number;
}) {
  return (
    <div className={clsx('flex flex-col', className)}>
      {(title || actions) && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            {title && (
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {title}
              </div>
            )}
            {subtitle && <div className="mt-0.5 text-[11px] text-slate-500">{subtitle}</div>}
          </div>
          {actions}
        </div>
      )}
      <div className="min-h-0 w-full" style={{ height }}>
        {children}
      </div>
    </div>
  );
}

export const CHART = {
  flow: '#14afc4',
  flowDim: '#0d7b8b',
  nominal: '#42b883',
  warning: '#f2a93b',
  critical: '#e65063',
  offline: '#5b7089',
  muted: '#64748b',
  grid: 'rgba(23, 54, 78, 0.55)',
  gridLight: 'rgba(148, 163, 184, 0.35)',
  tooltipBg: '#071522',
  tooltipBorder: '#17364e',
  softTooltipBg: '#ffffff',
  softTooltipBorder: '#e2e8f0',
  softText: '#334155',
  text: '#94a3b8',
} as const;

export function chartTooltipStyle(soft = false): React.CSSProperties {
  return {
    background: soft ? CHART.softTooltipBg : CHART.tooltipBg,
    border: `1px solid ${soft ? CHART.softTooltipBorder : CHART.tooltipBorder}`,
    borderRadius: soft ? 12 : 0,
    fontSize: 12,
    color: soft ? CHART.softText : '#e2e8f0',
    boxShadow: soft ? '0 8px 24px rgba(15,40,60,0.08)' : 'none',
  };
}
