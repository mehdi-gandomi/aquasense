'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { SEVERITY_COLOR } from '@aquasense/shared';
import { RING_SIZE, getChannel, setReplayBack } from '@/lib/channels';
import { useConsole } from '@/stores/useConsole';

/** One ring sample is roughly one second of plant time. */
const SAMPLE_MS = 1000;
const WINDOW_SAMPLES = RING_SIZE;

function formatOffset(samples: number): string {
  if (samples <= 0) return 'LIVE';
  const secs = Math.round((samples * SAMPLE_MS) / 1000);
  if (secs < 60) return `-${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `-${m}m ${String(s).padStart(2, '0')}s`;
}

export function TimeRibbon() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [back, setBack] = useState(0);

  const alerts = useConsole((s) => s.alerts);
  const events = useConsole((s) => s.events);
  const setReplayOffset = useConsole((s) => s.setReplayOffset);
  useConsole((s) => s.tick);

  // How much genuine history we actually hold, so the track can't imply more.
  const buffered = getChannel('INF-FLW-01')?.filled ?? 0;
  const usable = Math.max(1, Math.min(WINDOW_SAMPLES, buffered));

  const applyBack = useCallback(
    (samples: number) => {
      const clamped = Math.max(0, Math.min(usable - 1, samples));
      setBack(clamped);
      setReplayBack(clamped);
      setReplayOffset(clamped === 0 ? null : clamped * SAMPLE_MS);
    },
    [usable, setReplayOffset],
  );

  const pointerToBack = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      // Left edge is the oldest sample, right edge is live.
      return Math.round((1 - ratio) * (usable - 1));
    },
    [usable],
  );

  useEffect(() => {
    if (!dragging) return;

    const move = (e: PointerEvent) => applyBack(pointerToBack(e.clientX));
    const up = () => setDragging(false);

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [dragging, applyBack, pointerToBack]);

  useEffect(() => () => setReplayBack(0), []);

  const live = back === 0;
  const playheadPct = (1 - back / Math.max(1, usable - 1)) * 100;
  const latestEvent = events[0];

  return (
    <div className="chrome relative z-20 flex h-[74px] shrink-0 items-center gap-4 border-t-2 border-line bg-shell-900 px-4">
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => applyBack(0)}
          className={clsx(
            'focus-hard flex items-center gap-2 border-2 px-3 py-1.5 transition-colors',
            live
              ? 'border-nominal/60 bg-nominal/10 text-nominal'
              : 'border-line text-faint hover:border-flow hover:text-flow',
          )}
        >
          <span className={clsx('size-1.5', live ? 'animate-alarm bg-nominal' : 'bg-faint')} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">Live</span>
        </button>

        <div
          className={clsx(
            'min-w-[92px] border-2 px-2.5 py-1.5 text-center',
            live ? 'border-line' : 'border-flow/60 bg-flow/10',
          )}
        >
          <div className="label-xs">Cursor</div>
          <div
            className={clsx(
              'text-[13px] font-semibold leading-none tnum',
              live ? 'text-slate-300' : 'text-flow',
            )}
          >
            {formatOffset(back)}
          </div>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="label-xs">
            Plant Replay {'\u2014'} {Math.round((usable * SAMPLE_MS) / 1000)}s buffered
          </span>
          <span className="label-xs normal-case tracking-normal">
            {live ? 'Following live head' : 'Scrubbing history'}
          </span>
        </div>

        <div
          ref={trackRef}
          onPointerDown={(e) => {
            setDragging(true);
            applyBack(pointerToBack(e.clientX));
          }}
          className="group relative h-8 cursor-ew-resize border-2 border-line bg-shell-950 select-none"
        >
          <div className="absolute inset-0 grid-paper-fine opacity-40" />

          {/* Region ahead of the cursor is "the future" while scrubbing. */}
          {!live && (
            <div
              className="absolute inset-y-0 right-0 bg-shell-800/70"
              style={{ width: `${100 - playheadPct}%` }}
            />
          )}

          {/* Alarm incidents pinned along the timeline. */}
          {alerts.slice(0, 24).map((alert) => {
            const age = (Date.now() - alert.raisedAt) / SAMPLE_MS;
            if (age > usable) return null;
            const pct = (1 - age / Math.max(1, usable - 1)) * 100;
            return (
              <span
                key={alert.id}
                title={alert.message}
                className="absolute top-0 h-full w-[2px]"
                style={{
                  left: `${pct}%`,
                  backgroundColor: SEVERITY_COLOR[alert.severity],
                  opacity: 0.85,
                }}
              />
            );
          })}

          <div
            className="absolute top-0 h-full w-[2px] bg-flow"
            style={{ left: `${playheadPct}%` }}
          >
            <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-flow" />
            <span className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-flow" />
          </div>
        </div>
      </div>

      <div className="hidden min-w-0 max-w-[300px] shrink-0 items-center gap-2 border-2 border-line px-2.5 py-1.5 xl:flex">
        <span
          className={clsx(
            'size-1.5 shrink-0',
            latestEvent?.level === 'CRIT'
              ? 'bg-critical'
              : latestEvent?.level === 'WARN'
                ? 'bg-warning'
                : 'bg-flow',
          )}
        />
        <div className="min-w-0">
          <div className="label-xs">Last event</div>
          <div className="truncate text-[10px] text-slate-300">
            {latestEvent?.message ?? 'Awaiting plant events'}
          </div>
        </div>
      </div>
    </div>
  );
}
