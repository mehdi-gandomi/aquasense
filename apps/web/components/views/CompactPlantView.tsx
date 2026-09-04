'use client';

import clsx from 'clsx';
import { SEVERITY_COLOR, sensorsForFacility } from '@aquasense/shared';
import { getValue, series } from '@/lib/channels';
import { getSeverity } from '@/lib/channels';
import { formatValue } from '@/lib/format';
import { useConsole } from '@/stores/useConsole';
import { Sparkline } from '@/components/ui/primitives';

const STAGES = [
  { id: 'influent', label: 'Raw Intake', sub: 'Trade effluent receipt' },
  { id: 'preliminary', label: 'Balance & Dose', sub: 'DAF + neutralisation' },
  { id: 'effluent', label: 'Consented Discharge', sub: 'To Northfield sewer' },
] as const;

/**
 * Eastbank runs a short pre-treatment train, so it gets a flat schematic rather
 * than the full 3D works: three units in a row would not justify a WebGL scene.
 */
export function CompactPlantView() {
  const facilityId = useConsole((s) => s.facilityId);
  const select = useConsole((s) => s.select);
  const selection = useConsole((s) => s.selection);
  useConsole((s) => s.tick);

  const sensors = sensorsForFacility(facilityId);

  return (
    <div className="absolute inset-0 overflow-auto bg-shell-950 p-4 pt-24">
      <div className="pointer-events-none absolute inset-0 grid-paper opacity-25" />

      <div className="relative mx-auto flex min-h-full max-w-6xl items-center">
        <div className="grid w-full gap-4 lg:grid-cols-3">
          {STAGES.map((stage, index) => {
            const stageSensors = sensors.filter((s) => s.nodeId === stage.id);
            const worst = stageSensors.reduce<'nominal' | 'warning' | 'critical'>(
              (acc, s) => {
                const sev = getSeverity(s.id);
                if (sev === 'critical') return 'critical';
                if (sev === 'warning' && acc !== 'critical') return 'warning';
                return acc;
              },
              'nominal',
            );
            const selected = selection?.kind === 'node' && selection.id === stage.id;

            return (
              <div key={stage.id} className="relative">
                {index < STAGES.length - 1 && (
                  <div className="absolute -right-4 top-1/2 z-10 hidden h-0.5 w-4 bg-flow lg:block" />
                )}

                <button
                  type="button"
                  onClick={() => select({ kind: 'node', id: stage.id })}
                  className={clsx(
                    'slab-solid w-full p-3 text-left shadow-brut transition-colors',
                    selected ? 'border-flow' : 'border-line hover:border-line-bright',
                    worst === 'critical' && 'hazard-stripe',
                    worst === 'warning' && 'hazard-stripe-amber',
                  )}
                >
                  <div className="flex items-center gap-2 border-b-2 border-line pb-2">
                    <span
                      className="size-2"
                      style={{ backgroundColor: SEVERITY_COLOR[worst] }}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-bold uppercase tracking-[0.12em] text-slate-100">
                        {stage.label}
                      </div>
                      <div className="label-xs mt-0.5 normal-case tracking-normal">
                        {stage.sub}
                      </div>
                    </div>
                    <span className="label-xs ml-auto tnum">{stageSensors.length}</span>
                  </div>

                  <div className="mt-2 flex flex-col gap-1.5">
                    {stageSensors.map((sensor) => {
                      const sev = getSeverity(sensor.id);
                      const value = getValue(sensor.id);
                      return (
                        <div key={sensor.id} className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-[10px] text-slate-400">
                            {sensor.label}
                          </span>
                          <Sparkline
                            points={series(sensor.id, 40)}
                            color={SEVERITY_COLOR[sev]}
                            width={44}
                            height={14}
                            fill={false}
                          />
                          <span
                            className="w-16 text-right text-[12px] font-semibold tnum"
                            style={{ color: SEVERITY_COLOR[sev] }}
                          >
                            {formatValue(value, sensor.decimals)}
                          </span>
                          <span className="w-12 shrink-0 text-[8px] text-faint">
                            {sensor.unit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
