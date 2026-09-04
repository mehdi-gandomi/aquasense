'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import {
  SEVERITY_COLOR,
  rangeFraction,
  sensorsForFacility,
} from '@aquasense/shared';
import { getSeverity, getValue, series } from '@/lib/channels';
import { groupsForFacility } from '@/lib/health';
import { formatValue } from '@/lib/format';
import { useConsole } from '@/stores/useConsole';
import { RangeBar, Sparkline, StatusChip } from '@/components/ui/primitives';
import { StageVignette } from '@/components/twin/StageVignette';
import { WorkspaceHeader } from '@/components/views/WorkspaceHeader';

const GROUP_PRIMARY_NODE: Record<string, string> = {
  preliminary: 'preliminary',
  primary: 'primary',
  secondary: 'bioreactor',
  advanced: 'filtration',
  solids: 'digester',
  intake: 'influent',
  pretreat: 'preliminary',
  discharge: 'effluent',
  reservoir: 'reservoir',
};

export function TreatmentView() {
  const facilityId = useConsole((s) => s.facilityId);
  const select = useConsole((s) => s.select);
  useConsole((s) => s.tick);

  const groups = groupsForFacility(facilityId);
  const [active, setActive] = useState<string>(groups[0]?.id ?? 'preliminary');

  useEffect(() => {
    setActive(groups[0]?.id ?? 'preliminary');
  }, [facilityId]);

  const group = groups.find((g) => g.id === active) ?? groups[0];

  const sensors = sensorsForFacility(facilityId);
  const groupSensors = group
    ? sensors.filter((s) => group.nodes.includes(s.nodeId))
    : sensors;

  const totalFlagged = sensors.filter((s) => {
    const sev = getSeverity(s.id);
    return sev === 'warning' || sev === 'critical';
  }).length;

  return (
    <div className="absolute inset-0 overflow-y-auto bg-shell-950">
      <div className="pointer-events-none absolute inset-0 grid-paper opacity-20" />

      <div className="relative p-4">
        <WorkspaceHeader
          title="Treatment Stage Monitoring"
          subtitle={`${sensors.length} parameters \u2014 ${totalFlagged} flagged across the train`}
        />

        {/* Stage tabs carry their own flagged count, like the process spine. */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {groups.map((g) => {
            const owned = sensors.filter((s) => g.nodes.includes(s.nodeId as never));
            const flagged = owned.filter((s) => {
              const sev = getSeverity(s.id);
              return sev === 'warning' || sev === 'critical';
            }).length;
            const isActive = g.id === active;

            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setActive(g.id)}
                className={clsx(
                  'focus-hard flex items-center gap-2 border-2 px-3 py-2 transition-colors',
                  isActive
                    ? 'border-flow bg-flow/10 text-flow'
                    : 'border-line text-slate-400 hover:border-line-bright hover:text-slate-200',
                )}
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.14em]">
                  {g.label}
                </span>
                <span
                  className={clsx(
                    'px-1 text-[10px] font-bold tnum',
                    flagged > 0 ? 'text-warning' : 'text-faint',
                  )}
                >
                  {flagged > 0 ? flagged : owned.length}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[300px_1fr]">
          <div className="flex flex-col gap-3">
            {facilityId === 'northfield-wrrf' && GROUP_PRIMARY_NODE[active] && group && (
              <StageVignette nodeId={GROUP_PRIMARY_NODE[active]} label={group.label} />
            )}

            <div className="slab p-3 shadow-brut">
              <div className="label-xs mb-2">Stage Units</div>
              <div className="flex flex-col gap-1">
                {(group?.nodes ?? []).map((nodeId) => {
                  const owned = sensors.filter((s) => s.nodeId === nodeId);
                  return (
                    <button
                      key={nodeId}
                      type="button"
                      onClick={() => select({ kind: 'node', id: nodeId })}
                      className="flex items-center gap-2 border border-transparent px-2 py-1.5 text-left transition-colors hover:border-line hover:bg-shell-850"
                    >
                      <span className="size-1.5 bg-flow" />
                      <span className="flex-1 truncate text-[11px] uppercase tracking-[0.08em] text-slate-300">
                        {nodeId}
                      </span>
                      <span className="label-xs tnum">{owned.length}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
            {groupSensors.map((sensor) => {
              const value = getValue(sensor.id);
              const severity = getSeverity(sensor.id);
              const color = SEVERITY_COLOR[severity];

              return (
                <button
                  key={sensor.id}
                  type="button"
                  onClick={() => select({ kind: 'sensor', id: sensor.id })}
                  className="slab-solid p-2.5 text-left shadow-brut-sm transition-colors hover:border-line-bright"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-200">
                        {sensor.label}
                      </div>
                      <div className="label-xs mt-0.5 tnum">{sensor.id}</div>
                    </div>
                    <StatusChip severity={severity} />
                  </div>

                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span
                      className="text-[22px] font-semibold leading-none tnum"
                      style={{ color }}
                    >
                      {formatValue(value, sensor.decimals)}
                    </span>
                    <span className="text-[9px] text-faint">{sensor.unit}</span>
                    <span className="ml-auto">
                      <Sparkline
                        points={series(sensor.id, 40)}
                        color={color}
                        width={54}
                        height={18}
                        fill={false}
                      />
                    </span>
                  </div>

                  <div className="mt-2">
                    <RangeBar
                      fraction={rangeFraction(sensor, value)}
                      severity={severity}
                      warnLowFraction={
                        sensor.warnLow !== undefined
                          ? rangeFraction(sensor, sensor.warnLow)
                          : undefined
                      }
                      warnHighFraction={
                        sensor.warnHigh !== undefined
                          ? rangeFraction(sensor, sensor.warnHigh)
                          : undefined
                      }
                      targetFraction={
                        sensor.target !== undefined
                          ? rangeFraction(sensor, sensor.target)
                          : undefined
                      }
                    />
                    <div className="mt-1 flex justify-between">
                      <span className="label-xs normal-case tracking-normal">
                        {sensor.target !== undefined
                          ? `Target ${formatValue(sensor.target, sensor.decimals)} ${sensor.unit}`
                          : `Range ${sensor.min}\u2013${sensor.max}`}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
