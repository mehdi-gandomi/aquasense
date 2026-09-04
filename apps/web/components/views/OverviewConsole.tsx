'use client';

import clsx from 'clsx';
import {
  SEVERITY_COLOR,
  computeWqi,
  getFacility,
  sensorsForFacility,
} from '@aquasense/shared';
import { useAuth } from '@/stores/useAuth';
import { getValue, series } from '@/lib/channels';
import { facilityCounts } from '@/lib/health';
import { formatValue } from '@/lib/format';
import { useConsole } from '@/stores/useConsole';
import { Sparkline } from '@/components/ui/primitives';
import { ViewModeSwitch } from '@/components/providers/ThemeProvider';
import { EventTape } from '@/components/shell/EventTape';
import { TwinView } from '@/components/twin/TwinView';
import { ReservoirView } from '@/components/views/ReservoirView';
import { CompactPlantView } from '@/components/views/CompactPlantView';
import { ReservoirSchematic, SchematicPlantView } from '@/components/views/SchematicPlantView';
import { useTheme } from '@/stores/useTheme';

function KpiSlab({
  label,
  value,
  unit,
  note,
  accent,
  spark,
}: {
  label: string;
  value: string;
  unit?: string;
  note: string;
  accent: string;
  spark?: number[];
}) {
  return (
    <div className="slab min-w-[150px] flex-1 px-3 py-2 shadow-brut">
      <div className="flex items-start justify-between gap-2">
        <span className="label-xs">{label}</span>
        <span className="size-1.5" style={{ backgroundColor: accent }} />
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span
          className="text-[26px] font-semibold leading-none tnum"
          style={{ color: accent }}
        >
          {value}
        </span>
        {unit && <span className="text-[10px] text-faint">{unit}</span>}
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <span className="label-xs normal-case tracking-normal">{note}</span>
        {spark && spark.length > 1 && (
          <Sparkline points={spark} color={accent} width={52} height={16} fill={false} />
        )}
      </div>
    </div>
  );
}

export function OverviewConsole() {
  const facilityId = useConsole((s) => s.facilityId);
  const plants = useAuth((s) => s.plants);
  const viewMode = useTheme((s) => s.viewMode);
  useConsole((s) => s.tick);

  const facility = getFacility(facilityId, plants);
  const counts = facilityCounts(facilityId);
  const sensors = sensorsForFacility(facilityId);
  const hasTwin = sensors.length > 0;

  const isNorthfield = facilityId === 'northfield-wrrf';
  const isReservoir = facilityId === 'highland-reservoir' || (hasTwin && facility.kind === 'reservoir');

  const wqi = isNorthfield
    ? computeWqi({
        tss: getValue('EFF-TSS-01'),
        bod: getValue('EFF-BOD-01'),
        nh4: getValue('EFF-NH4-01'),
        turbidity: getValue('EFF-TRB-01'),
        do: getValue('EFF-DO-01'),
      })
    : null;

  const flowSensor = isNorthfield
    ? 'INF-FLW-01'
    : facilityId === 'eastbank-industrial'
      ? 'EB-FLW-01'
      : 'HR-LVL-01';

  const flowDef =
    sensors.find((s) => s.id === flowSensor) ??
    sensors.find((s) => s.parameter === 'flow') ??
    sensors.find((s) => s.pinned);
  const flow = flowDef ? getValue(flowDef.id) : null;

  return (
    <div className="absolute inset-0">
      {!hasTwin ? (
        <div className="grid-paper flex h-full items-center justify-center p-6">
          <div className="slab max-w-md p-5 shadow-brut">
            <div className="text-[13px] font-bold uppercase tracking-[0.16em] text-white">
              No twin template
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
              {facility.shortName} has a map location but no cloned sensor catalogue. Assign a
              WRRF, industrial, or reservoir template when creating the plant to instrument the
              console.
            </p>
          </div>
        </div>
      ) : viewMode === '2d' ? (
        isReservoir ? (
          <ReservoirSchematic />
        ) : isNorthfield || facility.kind === 'wrrf' ? (
          <SchematicPlantView />
        ) : (
          <CompactPlantView />
        )
      ) : isNorthfield || facility.hasFullTwin ? (
        <TwinView />
      ) : isReservoir ? (
        <ReservoirView />
      ) : (
        <CompactPlantView />
      )}

      {hasTwin && (
        <div className="chrome pointer-events-auto absolute bottom-3 right-3 z-20">
          <ViewModeSwitch />
        </div>
      )}

      {/* KPI slabs dock over the twin rather than pushing it into a box. */}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap gap-2 lg:right-auto lg:max-w-[640px]">
        <KpiSlab
          label="Instruments online"
          value={String(counts.total)}
          note={`${counts.nominal} nominal`}
          accent="#14afc4"
        />
        <KpiSlab
          label="Critical alerts"
          value={String(counts.critical)}
          note={`${counts.warning} warnings active`}
          accent={counts.critical > 0 ? SEVERITY_COLOR.critical : SEVERITY_COLOR.nominal}
        />
        {wqi !== null ? (
          <KpiSlab
            label="Water quality index"
            value={wqi.toFixed(1)}
            note={wqi > 80 ? 'Consent comfortable' : wqi > 60 ? 'Monitor closely' : 'At risk'}
            accent={wqi > 80 ? SEVERITY_COLOR.nominal : wqi > 60 ? SEVERITY_COLOR.warning : SEVERITY_COLOR.critical}
          />
        ) : (
          <KpiSlab
            label="Design capacity"
            value={String(facility.designFlow)}
            unit="m3/h"
            note={facility.kind === 'reservoir' ? 'Receiving water' : 'Consented throughput'}
            accent="#14afc4"
          />
        )}
        {flowDef && (
          <KpiSlab
            label={flowDef.label}
            value={formatValue(flow, flowDef.decimals)}
            unit={flowDef.unit}
            note="Live 60s trend"
            accent="#4fd8ea"
            spark={series(flowDef.id, 60)}
          />
        )}
      </div>

      {/* Event tape docks top-right, translucent over the plant. */}
      <div className="pointer-events-auto absolute right-3 top-3 hidden w-[330px] xl:block">
        <div className="slab shadow-brut">
          <div className="flex items-center gap-2 border-b-2 border-line bg-shell-850/70 px-3 py-2">
            <span className="size-1.5 animate-alarm bg-flow" />
            <span className="label-xs text-slate-300">Live SCADA event stream</span>
            <span className="label-xs ml-auto tnum">{facility.code}</span>
          </div>
          <EventTape limit={12} dense className="max-h-[240px] px-1" />
        </div>
      </div>

      <div
        className={clsx(
          'pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 md:block',
        )}
      >
        <div className="slab flex items-center gap-4 px-3 py-1.5 shadow-brut">
          <span className="label-xs">{facility.shortName}</span>
          <span className="h-3 w-px bg-line" />
          <span className="text-[10px] text-muted tnum">
            {counts.total} pts {'\u00B7'} {counts.warning + counts.critical} flagged
          </span>
        </div>
      </div>
    </div>
  );
}
