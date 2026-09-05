'use client';

import { useState } from 'react';
import clsx from 'clsx';
import {
  HAB_LEVEL_LABEL,
  SEVERITY_COLOR,
  sensorsForFacility,
} from '@aquasense/shared';
import { getSeverity, getValue, series } from '@/lib/channels';
import { liveBloomAssessment } from '@/lib/bloom';
import { formatValue } from '@/lib/format';
import { useConsole } from '@/stores/useConsole';
import { HardButton, RangeBar, Sparkline, StatusChip } from '@/components/ui/primitives';
import { DriverBars } from '@/components/charts/Charts';
import { ReservoirView } from '@/components/views/ReservoirView';
import { WorkspaceHeader } from '@/components/views/WorkspaceHeader';

const FORECAST_TONE = {
  LOW: 'nominal',
  MODERATE: 'warning',
  HIGH: 'warning',
  SEVERE: 'critical',
} as const;

const TABS = [
  { id: 'hazard', label: 'Hazard & Risk' },
  { id: 'env', label: 'Environmental' },
  { id: 'ops', label: 'Operational' },
] as const;

export function DownstreamView() {
  useConsole((s) => s.tick);
  const select = useConsole((s) => s.select);
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('hazard');

  const assessment = liveBloomAssessment();
  const forecastSev = FORECAST_TONE[assessment.forecast];
  const habSev =
    assessment.habLevel >= 4
      ? 'critical'
      : assessment.habLevel >= 3
        ? 'warning'
        : 'nominal';

  const sensors = sensorsForFacility('highland-reservoir');
  const envIds = ['HR-TMP-01', 'HR-DO-01', 'HR-PH-01', 'HR-SDD-01', 'HR-TRB-01', 'HR-LVL-01'];
  const shown =
    tab === 'env'
      ? sensors.filter((s) => envIds.includes(s.id))
      : tab === 'ops'
        ? sensors.filter((s) => ['HR-TN-01', 'HR-TP-01', 'HR-LVL-01', 'HR-DO-01'].includes(s.id))
        : sensors.filter((s) =>
            ['HR-CHL-01', 'HR-PHY-01', 'HR-TN-01', 'HR-TP-01', 'HR-TMP-01'].includes(s.id),
          );

  return (
    <div className="absolute inset-0 overflow-y-auto bg-shell-950">
      <div className="relative h-[42vh] min-h-[280px] border-b-2 border-line">
        <ReservoirView />
        <div className="pointer-events-none absolute left-4 top-4 slab px-3 py-2 shadow-brut">
          <div className="label-xs">Catchment receiving water</div>
          <div className="mt-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-white">
            Highland Reservoir
          </div>
        </div>
      </div>

      <div className="relative p-4">
        <WorkspaceHeader
          title="Algal Bloom Indices"
          subtitle={`${sensors.length} ambient instruments — Northfield outfall is a driver`}
        >
          <StatusChip severity={forecastSev} label={`${assessment.forecast} bloom risk`} />
        </WorkspaceHeader>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Algal hazard score',
              value: `${assessment.hazardScore}`,
              unit: '/100',
              note: HAB_LEVEL_LABEL[assessment.habLevel],
              accent: SEVERITY_COLOR[habSev],
              frac: assessment.hazardScore / 100,
            },
            {
              label: 'Bloom forecast',
              value: assessment.forecast,
              note: `HAB level ${assessment.habLevel}`,
              accent: SEVERITY_COLOR[forecastSev],
              frac:
                assessment.forecast === 'SEVERE'
                  ? 1
                  : assessment.forecast === 'HIGH'
                    ? 0.78
                    : assessment.forecast === 'MODERATE'
                      ? 0.5
                      : 0.22,
            },
            {
              label: 'Toxin risk index',
              value: String(assessment.toxinRiskIndex),
              unit: '/100',
              note: assessment.toxinRiskIndex > 55 ? 'Elevated' : 'Stable',
              accent:
                assessment.toxinRiskIndex > 55
                  ? SEVERITY_COLOR.warning
                  : SEVERITY_COLOR.nominal,
              frac: assessment.toxinRiskIndex / 100,
            },
            {
              label: 'Algal biomass',
              value: formatValue(assessment.biomass, 0),
              unit: 'cells/mL',
              note: `Integrity ${assessment.cellIntegrity.toFixed(2)}`,
              accent: '#14afc4',
              frac: Math.min(1, assessment.biomass / 90000),
            },
          ].map((kpi) => (
            <div key={kpi.label} className="slab-solid p-3 shadow-brut">
              <div className="label-xs">{kpi.label}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span
                  className="text-[26px] font-semibold leading-none tnum"
                  style={{ color: kpi.accent }}
                >
                  {kpi.value}
                </span>
                {kpi.unit && <span className="text-[10px] text-faint">{kpi.unit}</span>}
              </div>
              <div className="mt-3 h-1.5 bg-shell-800">
                <div
                  className="h-full transition-[width] duration-500"
                  style={{ width: `${kpi.frac * 100}%`, backgroundColor: kpi.accent }}
                />
              </div>
              <div className="label-xs mt-2 normal-case tracking-normal">{kpi.note}</div>
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[280px_1fr]">
          <div className="slab shadow-brut">
            <div className="border-b-2 border-line bg-shell-850/70 px-3 py-2">
              <span className="label-xs text-slate-300">Risk drivers</span>
            </div>
            <div className="p-2">
              <DriverBars drivers={assessment.drivers} height={210} />
              <div className="border-t-2 border-line px-1 pt-3">
                <div className="label-xs mb-1">DBP formation risk</div>
                <div className="text-[20px] font-semibold text-warning tnum">
                  {assessment.dbpRisk}
                  <span className="ml-1 text-[10px] font-normal text-faint">/100</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap gap-1.5">
              {TABS.map((t) => (
                <HardButton key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
                  {t.label}
                </HardButton>
              ))}
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {shown.map((sensor) => {
                const value = getValue(sensor.id);
                const severity = getSeverity(sensor.id);
                const color = SEVERITY_COLOR[severity];
                return (
                  <button
                    key={sensor.id}
                    type="button"
                    onClick={() => select({ kind: 'sensor', id: sensor.id })}
                    className={clsx(
                      'slab-solid p-2.5 text-left shadow-brut-sm transition-colors hover:border-line-bright',
                      severity === 'critical' && 'hazard-stripe',
                    )}
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
                      <span className="text-[22px] font-semibold leading-none tnum" style={{ color }}>
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
                      <RangeBar fraction={Math.min(1, (value - sensor.min) / (sensor.max - sensor.min || 1))} severity={severity} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
