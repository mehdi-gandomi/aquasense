'use client';

import clsx from 'clsx';
import {
  SEVERITY_COLOR,
  getSensor,
  limitsForFacility,
  type ComplianceLimit,
} from '@aquasense/shared';
import { getValue } from '@/lib/channels';
import { formatValue } from '@/lib/format';
import { useConsole } from '@/stores/useConsole';
import { WorkspaceHeader } from '@/components/views/WorkspaceHeader';
import { ComplianceUtilBars } from '@/components/charts/Charts';

interface Assessed {
  limit: ComplianceLimit;
  value: number;
  utilisation: number;
  state: 'nominal' | 'warning' | 'critical';
  /** UV dose is a floor, not a ceiling, so its maths runs the other way. */
  inverted: boolean;
}

function assess(limit: ComplianceLimit): Assessed {
  const value = getValue(limit.sensorId);
  const inverted = limit.actionLevel > limit.limit;

  const utilisation = inverted
    ? Math.min(1.6, limit.limit / Math.max(value, 0.0001))
    : Math.min(1.6, value / limit.limit);

  const breached = inverted ? value < limit.limit : value > limit.limit;
  const nearing = inverted ? value < limit.actionLevel : value > limit.actionLevel;

  return {
    limit,
    value,
    utilisation,
    state: breached ? 'critical' : nearing ? 'warning' : 'nominal',
    inverted,
  };
}

/**
 * Compliance rosette: one arc per consent parameter, length is how much of the
 * permitted headroom is consumed. A full ring means the consent is being used up.
 */
function Rosette({ items }: { items: Assessed[] }) {
  const size = 380;
  const cx = size / 2;
  const cy = size / 2;
  const inner = 62;
  const ringGap = 5;
  const thickness = Math.max(9, (cx - inner - 26) / Math.max(1, items.length) - ringGap);

  const arc = (radius: number, fraction: number) => {
    const clamped = Math.min(1, Math.max(0.001, fraction));
    const start = -Math.PI / 2;
    const end = start + clamped * Math.PI * 1.72;
    const x1 = cx + Math.cos(start) * radius;
    const y1 = cy + Math.sin(start) * radius;
    const x2 = cx + Math.cos(end) * radius;
    const y2 = cy + Math.sin(end) * radius;
    const large = clamped * 1.72 > 1 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  };

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full max-w-[380px]">
      <circle cx={cx} cy={cy} r={inner - 8} fill="none" stroke="#17364e" strokeWidth={1} />

      {items.map((item, i) => {
        const radius = inner + i * (thickness + ringGap);
        const color = SEVERITY_COLOR[item.state];
        return (
          <g key={item.limit.id}>
            <path
              d={arc(radius, 1)}
              fill="none"
              stroke="#102a3e"
              strokeWidth={thickness}
              strokeLinecap="butt"
            />
            <path
              d={arc(radius, item.utilisation)}
              fill="none"
              stroke={color}
              strokeWidth={thickness}
              strokeLinecap="butt"
              opacity={0.92}
            />
            {/* Consent ceiling tick */}
            <circle
              cx={cx + Math.cos(-Math.PI / 2 + 1.72 * Math.PI) * radius}
              cy={cy + Math.sin(-Math.PI / 2 + 1.72 * Math.PI) * radius}
              r={2}
              fill="#5b7089"
            />
          </g>
        );
      })}

      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        className="fill-slate-200"
        style={{ fontSize: 11, letterSpacing: '0.16em', fontWeight: 700 }}
      >
        CONSENT
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        className="fill-flow"
        style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)' }}
      >
        {items.filter((i) => i.state === 'nominal').length}/{items.length}
      </text>
      <text
        x={cx}
        y={cy + 28}
        textAnchor="middle"
        className="fill-slate-500"
        style={{ fontSize: 8, letterSpacing: '0.14em' }}
      >
        WITHIN LIMIT
      </text>
    </svg>
  );
}

export function ComplianceView() {
  const facilityId = useConsole((s) => s.facilityId);
  useConsole((s) => s.tick);

  const items = limitsForFacility(facilityId).map(assess);
  const breaches = items.filter((i) => i.state === 'critical');
  const nearing = items.filter((i) => i.state === 'warning');

  return (
    <div className="absolute inset-0 overflow-y-auto bg-shell-950">
      <div className="pointer-events-none absolute inset-0 grid-paper opacity-20" />

      <div className="relative p-4">
        <WorkspaceHeader
          title="Effluent Compliance"
          subtitle={`${items.length} consent parameters \u2014 ${breaches.length} in breach, ${nearing.length} approaching`}
        />

        {items.length === 0 ? (
          <div className="slab mt-4 flex items-center justify-center py-16">
            <span className="label-xs normal-case tracking-normal">
              This facility has no discharge consent configured.
            </span>
          </div>
        ) : (
          <div className="mt-3 grid gap-3 xl:grid-cols-[400px_1fr]">
            <div className="flex flex-col gap-3">
              <div className="slab flex flex-col items-center p-4 shadow-brut">
                <div className="label-xs mb-3 self-start">Consent Utilisation Rosette</div>
                <Rosette items={items} />
                <div className="mt-3 flex flex-wrap justify-center gap-3 border-t-2 border-line pt-3">
                  {(['nominal', 'warning', 'critical'] as const).map((s) => (
                    <span key={s} className="flex items-center gap-1.5">
                      <span className="size-2" style={{ backgroundColor: SEVERITY_COLOR[s] }} />
                      <span className="label-xs">
                        {s === 'nominal' ? 'Within' : s === 'warning' ? 'Approaching' : 'Breach'}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="slab p-3 shadow-brut">
                <ComplianceUtilBars
                  items={items.map((i) => ({
                    label: i.limit.label,
                    utilisation: i.utilisation,
                    state: i.state,
                  }))}
                  height={Math.max(180, items.length * 36)}
                />
              </div>
            </div>

            <div className="slab shadow-brut">
              <div className="flex items-center gap-2 border-b-2 border-line bg-shell-850/70 px-3 py-2">
                <span className="label-xs text-slate-300">Consent Ledger</span>
                <span className="label-xs ml-auto normal-case tracking-normal">
                  Live against permitted limits
                </span>
              </div>

              <div className="divide-y divide-line/50">
                {items.map((item) => {
                  const sensor = getSensor(item.limit.sensorId);
                  const color = SEVERITY_COLOR[item.state];
                  return (
                    <div
                      key={item.limit.id}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2.5',
                        item.state === 'critical' && 'hazard-stripe',
                      )}
                    >
                      <span className="size-2 shrink-0" style={{ backgroundColor: color }} />

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-100">
                          {item.limit.label}
                        </div>
                        <div className="label-xs mt-0.5 normal-case tracking-normal">
                          {item.limit.authority} {'\u00B7'} {item.limit.window}
                        </div>
                      </div>

                      <div className="hidden w-32 shrink-0 sm:block">
                        <div className="h-1.5 w-full bg-shell-800">
                          <div
                            className="h-full transition-[width] duration-500"
                            style={{
                              width: `${Math.min(100, item.utilisation * 100)}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                        <div className="label-xs mt-1 tnum">
                          {Math.round(item.utilisation * 100)}% of consent
                        </div>
                      </div>

                      <div className="w-20 shrink-0 text-right">
                        <div
                          className="text-[15px] font-semibold leading-none tnum"
                          style={{ color }}
                        >
                          {formatValue(item.value, sensor?.decimals ?? 2)}
                        </div>
                        <div className="label-xs mt-1">{item.limit.unit}</div>
                      </div>

                      <div className="w-20 shrink-0 border-l-2 border-line pl-3 text-right">
                        <div className="text-[12px] text-slate-400 tnum">
                          {item.inverted ? '\u2265' : '\u2264'}{' '}
                          {formatValue(item.limit.limit, sensor?.decimals ?? 2)}
                        </div>
                        <div className="label-xs mt-1">Limit</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
