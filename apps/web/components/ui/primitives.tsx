'use client';

import clsx from 'clsx';
import { SEVERITY_COLOR, type Severity } from '@aquasense/shared';

export function Slab({
  className,
  children,
  solid,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { solid?: boolean }) {
  return (
    <div
      className={clsx(solid ? 'slab-solid' : 'slab', 'shadow-brut', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SlabHeader({
  title,
  meta,
  accent,
  children,
}: {
  title: string;
  meta?: string;
  accent?: Severity;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b-2 border-line bg-shell-850/70 px-3 py-2">
      {accent && (
        <span
          className="size-2 shrink-0"
          style={{ backgroundColor: SEVERITY_COLOR[accent] }}
        />
      )}
      <h2 className="label-sm text-[11px] tracking-[0.18em] text-slate-200">{title}</h2>
      {meta && <span className="label-xs ml-auto tnum">{meta}</span>}
      {children && <div className="ml-auto flex items-center gap-1.5">{children}</div>}
    </div>
  );
}

export function SeverityDot({
  severity,
  size = 8,
  pulse,
}: {
  severity: Severity;
  size?: number;
  pulse?: boolean;
}) {
  return (
    <span
      className={clsx('inline-block shrink-0', pulse && severity === 'critical' && 'animate-alarm')}
      style={{
        width: size,
        height: size,
        backgroundColor: SEVERITY_COLOR[severity],
        boxShadow: `0 0 ${size}px ${SEVERITY_COLOR[severity]}66`,
      }}
    />
  );
}

export function StatusChip({
  severity,
  label,
  className,
}: {
  severity: Severity;
  label?: string;
  className?: string;
}) {
  const text = label ?? severity.toUpperCase();
  return (
    <span
      className={clsx(
        'border px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-[0.14em]',
        className,
      )}
      style={{
        color: SEVERITY_COLOR[severity],
        borderColor: `${SEVERITY_COLOR[severity]}55`,
        backgroundColor: `${SEVERITY_COLOR[severity]}12`,
      }}
    >
      {text}
    </span>
  );
}

/** Horizontal instrument range with warning bands and a live needle. */
export function RangeBar({
  fraction,
  severity,
  warnLowFraction,
  warnHighFraction,
  targetFraction,
}: {
  fraction: number;
  severity: Severity;
  warnLowFraction?: number;
  warnHighFraction?: number;
  targetFraction?: number;
}) {
  const color = SEVERITY_COLOR[severity];
  return (
    <div className="relative h-1.5 w-full bg-shell-800">
      {warnLowFraction !== undefined && warnLowFraction > 0 && (
        <div
          className="absolute inset-y-0 left-0 bg-warning/20"
          style={{ width: `${warnLowFraction * 100}%` }}
        />
      )}
      {warnHighFraction !== undefined && warnHighFraction < 1 && (
        <div
          className="absolute inset-y-0 right-0 bg-warning/20"
          style={{ width: `${(1 - warnHighFraction) * 100}%` }}
        />
      )}
      <div
        className="absolute inset-y-0 left-0 transition-[width] duration-300 ease-out"
        style={{ width: `${fraction * 100}%`, backgroundColor: color }}
      />
      {targetFraction !== undefined && (
        <div
          className="absolute -top-0.5 h-2.5 w-px bg-slate-300/70"
          style={{ left: `${targetFraction * 100}%` }}
        />
      )}
    </div>
  );
}

/** Compact SVG sparkline drawn from a ring-buffer slice. */
export function Sparkline({
  points,
  color,
  width = 96,
  height = 26,
  fill = true,
}: {
  points: number[];
  color: string;
  width?: number;
  height?: number;
  fill?: boolean;
}) {
  if (points.length < 2) {
    return <svg width={width} height={height} aria-hidden />;
  }

  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    if (p < min) min = p;
    if (p > max) max = p;
  }
  const span = max - min || 1;
  const step = width / (points.length - 1);

  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = height - ((p - min) / span) * (height - 3) - 1.5;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      {fill && (
        <path
          d={`${path} L${width},${height} L0,${height} Z`}
          fill={color}
          opacity={0.14}
        />
      )}
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

export function HardButton({
  children,
  active,
  tone = 'default',
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  tone?: 'default' | 'flow' | 'critical' | 'warning';
}) {
  const tones = {
    default: 'border-line text-slate-300 hover:border-line-bright hover:text-white',
    flow: 'border-flow/60 text-flow hover:bg-flow/10',
    critical: 'border-critical/60 text-critical hover:bg-critical/10',
    warning: 'border-warning/60 text-warning hover:bg-warning/10',
  } as const;

  return (
    <button
      type="button"
      className={clsx(
        'focus-hard border-2 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors',
        active ? 'border-flow bg-flow/15 text-flow' : tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
