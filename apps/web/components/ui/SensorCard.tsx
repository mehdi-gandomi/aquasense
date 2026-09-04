'use client';

import clsx from 'clsx';
import {
  SEVERITY_COLOR,
  rangeFraction,
  type SensorDef,
} from '@aquasense/shared';
import { getSeverity, getValue, series } from '@/lib/channels';
import { formatValue } from '@/lib/format';
import { useConsole } from '@/stores/useConsole';
import { RangeBar, Sparkline, StatusChip } from './primitives';

export function SensorCard({ sensor }: { sensor: SensorDef }) {
  const select = useConsole((s) => s.select);
  const selection = useConsole((s) => s.selection);

  const value = getValue(sensor.id);
  const severity = getSeverity(sensor.id);
  const color = SEVERITY_COLOR[severity];
  const selected = selection?.kind === 'sensor' && selection.id === sensor.id;

  return (
    <button
      type="button"
      onClick={() => select({ kind: 'sensor', id: sensor.id })}
      className={clsx(
        'slab-solid group relative flex flex-col p-3 text-left shadow-brut transition-all hover:-translate-y-0.5',
        selected ? 'border-flow' : 'border-line hover:border-line-bright',
      )}
    >
      {/* Severity is carried on the leading edge, so a wall of cards scans fast. */}
      <span
        className="absolute inset-y-0 left-0 w-[3px] transition-all"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-start justify-between gap-2 pl-1.5">
        <div className="min-w-0">
          <div className="label-xs truncate">{sensor.nodeId}</div>
          <div className="mt-1 truncate text-[12px] font-bold uppercase tracking-[0.1em] text-slate-100">
            {sensor.label}
          </div>
        </div>
        <StatusChip severity={severity} />
      </div>

      <div className="mt-3 flex items-baseline gap-1.5 pl-1.5">
        <span
          className="text-[30px] font-semibold leading-none tnum"
          style={{ color }}
        >
          {formatValue(value, sensor.decimals)}
        </span>
        <span className="text-[10px] text-faint">{sensor.unit}</span>
        <span className="ml-auto">
          <Sparkline points={series(sensor.id, 48)} color={color} width={70} height={22} />
        </span>
      </div>

      <div className="mt-3 pl-1.5">
        <RangeBar
          fraction={rangeFraction(sensor, value)}
          severity={severity}
          warnLowFraction={
            sensor.warnLow !== undefined ? rangeFraction(sensor, sensor.warnLow) : undefined
          }
          warnHighFraction={
            sensor.warnHigh !== undefined ? rangeFraction(sensor, sensor.warnHigh) : undefined
          }
          targetFraction={
            sensor.target !== undefined ? rangeFraction(sensor, sensor.target) : undefined
          }
        />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="label-xs tnum">{sensor.min}</span>
          <span className="label-xs tnum">
            {sensor.target !== undefined
              ? `TGT ${formatValue(sensor.target, sensor.decimals)}`
              : sensor.id}
          </span>
          <span className="label-xs tnum">{sensor.max}</span>
        </div>
      </div>
    </button>
  );
}
