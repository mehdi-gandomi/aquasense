'use client';

import clsx from 'clsx';
import type { EventLogEntry } from '@aquasense/shared';
import { formatTimeOfDay } from '@/lib/format';
import { useConsole } from '@/stores/useConsole';

const LEVEL_STYLE: Record<EventLogEntry['level'], { text: string; gutter: string }> = {
  CRIT: { text: 'text-critical', gutter: 'bg-critical' },
  WARN: { text: 'text-warning', gutter: 'bg-warning' },
  AUTO: { text: 'text-flow', gutter: 'bg-flow' },
  INFO: { text: 'text-muted', gutter: 'bg-offline' },
};

/** Monospace punch-tape. Severity is carried by a gutter bar, not a pill. */
export function EventTape({
  limit = 40,
  className,
  dense,
}: {
  limit?: number;
  className?: string;
  dense?: boolean;
}) {
  const events = useConsole((s) => s.events);

  if (events.length === 0) {
    return (
      <div className={clsx('flex items-center justify-center py-8', className)}>
        <span className="label-xs normal-case tracking-normal">
          Event stream idle {'\u2014'} waiting for plant activity
        </span>
      </div>
    );
  }

  return (
    <div className={clsx('deck-scroll overflow-y-auto', className)}>
      {events.slice(0, limit).map((entry) => {
        const style = LEVEL_STYLE[entry.level];
        return (
          <div
            key={entry.id}
            className={clsx(
              'flex items-start gap-2 border-b border-line/40 pr-2 transition-colors hover:bg-shell-850/60',
              dense ? 'py-1' : 'py-1.5',
            )}
          >
            <span className={clsx('w-[3px] shrink-0 self-stretch', style.gutter)} />
            <span className="shrink-0 text-[10px] text-faint tnum">
              {formatTimeOfDay(entry.at)}
            </span>
            <span
              className={clsx(
                'w-9 shrink-0 text-[9px] font-bold uppercase tracking-[0.1em]',
                style.text,
              )}
            >
              {entry.level}
            </span>
            <span className="w-[74px] shrink-0 truncate text-[10px] text-slate-400 tnum">
              {entry.source}
            </span>
            <span className="min-w-0 flex-1 text-[10px] leading-snug text-slate-300">
              {entry.message}
            </span>
          </div>
        );
      })}
    </div>
  );
}
