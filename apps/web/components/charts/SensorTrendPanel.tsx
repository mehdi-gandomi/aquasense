'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { SEVERITY_COLOR, type SensorDef } from '@aquasense/shared';
import { api } from '@/lib/api';
import { series } from '@/lib/channels';
import { TrendAreaChart } from './Charts';
import { HardButton } from '@/components/ui/primitives';

type RangeKey = 'live' | '1h' | '6h' | '24h';

const RANGES: Array<{ id: RangeKey; label: string; ms: number; bucket: string }> = [
  { id: 'live', label: 'Live', ms: 0, bucket: '5s' },
  { id: '1h', label: '1h', ms: 60 * 60_000, bucket: '30s' },
  { id: '6h', label: '6h', ms: 6 * 60 * 60_000, bucket: '2m' },
  { id: '24h', label: '24h', ms: 24 * 60 * 60_000, bucket: '5m' },
];

interface TrendResponse {
  connected: boolean;
  points: Array<{ t: number; value: number }>;
}

/** Live ring buffer or MySQL-backed `/history/trend` area chart for an instrument. */
export function SensorTrendPanel({
  sensor,
  facilityId,
  severity = 'nominal',
  soft,
}: {
  sensor: SensorDef;
  facilityId: string;
  severity?: keyof typeof SEVERITY_COLOR;
  soft?: boolean;
}) {
  const [range, setRange] = useState<RangeKey>('live');
  const [history, setHistory] = useState<Array<{ t: number; value: number }>>([]);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (range !== 'live') return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [range]);

  const livePoints = useMemo(
    () =>
      series(sensor.id, 90).map((value, i, arr) => ({
        t: Date.now() - (arr.length - 1 - i) * 1000,
        value,
      })),
    // tick forces refresh while live
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sensor.id, tick],
  );

  useEffect(() => {
    if (range === 'live') {
      setHistory([]);
      setConnected(null);
      return;
    }

    const meta = RANGES.find((r) => r.id === range)!;
    const to = Date.now();
    const from = to - meta.ms;
    let cancelled = false;

    const load = () => {
      setLoading(true);
      void api<TrendResponse>(
        `/history/trend?facility=${encodeURIComponent(facilityId)}&sensorId=${encodeURIComponent(sensor.id)}&from=${from}&to=${to}&bucket=${meta.bucket}`,
      )
        .then((res) => {
          if (cancelled) return;
          setConnected(res.connected);
          setHistory(res.points ?? []);
        })
        .catch(() => {
          if (!cancelled) {
            setConnected(false);
            setHistory([]);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    load();
    const t = setInterval(load, range === '1h' ? 30_000 : 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [range, facilityId, sensor.id]);

  const data = range === 'live' ? livePoints : history;

  const emptyLabel =
    range === 'live'
      ? 'Waiting for samples…'
      : connected === false
        ? 'History DB offline — switch to Live'
        : loading
          ? 'Loading trend…'
          : 'No samples in this window';

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1">
        {RANGES.map((r) =>
          soft ? (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={clsx(
                'rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors',
                range === r.id
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {r.label}
            </button>
          ) : (
            <HardButton key={r.id} active={range === r.id} onClick={() => setRange(r.id)}>
              {r.label}
            </HardButton>
          ),
        )}
        {connected === false && range !== 'live' && (
          <span
            className={clsx(
              'ml-auto text-[10px] uppercase tracking-[0.12em]',
              soft ? 'text-amber-600' : 'text-warning',
            )}
          >
            History offline
          </span>
        )}
      </div>
      <div className={soft ? 'rounded-xl bg-slate-50 p-2' : 'border-2 border-line bg-shell-950/60 p-2'}>
        <TrendAreaChart
          data={data}
          color={SEVERITY_COLOR[severity]}
          unit={sensor.unit}
          soft={soft}
          warnHigh={sensor.warnHigh}
          critHigh={sensor.critHigh}
          warnLow={sensor.warnLow}
          critLow={sensor.critLow}
          height={160}
          emptyLabel={emptyLabel}
        />
      </div>
    </div>
  );
}
