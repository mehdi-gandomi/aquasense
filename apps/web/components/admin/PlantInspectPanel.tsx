'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SEVERITY_COLOR, type Severity, type SensorDef } from '@aquasense/shared';
import { api } from '@/lib/api';
import { formatValue } from '@/lib/format';
import {
  AdminButton,
  AdminCardTitle,
} from '@/components/admin/AdminUi';
import type { FleetSite } from '@/components/admin/CatchmentMap';

export type PlantSensorRow = SensorDef & {
  value?: number;
  severity?: Severity;
  recordedAt?: number;
};

export function PlantInspectPanel({
  site,
  selectedSensorId,
  placeMode,
  onTogglePlace,
  onSelectSensor,
  onDeleteSensor,
  onRefresh,
}: {
  site: FleetSite | null;
  selectedSensorId?: string | null;
  placeMode?: boolean;
  onTogglePlace?: () => void;
  onSelectSensor?: (id: string) => void;
  onDeleteSensor?: (id: string) => void;
  onRefresh?: () => void;
}) {
  const [sensors, setSensors] = useState<PlantSensorRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!site) {
      setSensors([]);
      return;
    }
    let cancelled = false;
    const load = () => {
      setLoading(true);
      void api<PlantSensorRow[]>(`/admin/plants/${encodeURIComponent(site.id)}/sensors`)
        .then((rows) => {
          if (!cancelled) {
            setSensors(rows);
            setError(null);
          }
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load sensors');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    load();
    const t = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [site?.id]);

  if (!site) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="text-[13px] font-semibold text-slate-700">Select a plant</div>
        <p className="mt-1 text-[12px] text-slate-500">
          Click a plant icon on the map to inspect instruments and place sensors.
        </p>
      </div>
    );
  }

  const mapPlaced = sensors.filter((s) => s.source === 'catalogue' || s.source === 'custom');
  const template = sensors.filter((s) => s.source !== 'catalogue' && s.source !== 'custom');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <AdminCardTitle>{site.shortName}</AdminCardTitle>
            <div className="mt-0.5 text-[12px] text-slate-500">
              {site.code} · {site.kind}
              {site.address ? ` · ${site.address}` : ''}
            </div>
          </div>
          <span
            className="mt-0.5 size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: SEVERITY_COLOR[site.severity] }}
            title={site.severity}
          />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-50 px-2 py-2 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Pts</div>
            <div className="mt-0.5 text-[16px] font-semibold text-slate-800">{site.instruments}</div>
          </div>
          <div className="rounded-xl bg-amber-50 px-2 py-2 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-600/80">Warn</div>
            <div className="mt-0.5 text-[16px] font-semibold text-amber-700">{site.warning}</div>
          </div>
          <div className="rounded-xl bg-rose-50 px-2 py-2 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-500/80">Crit</div>
            <div className="mt-0.5 text-[16px] font-semibold text-rose-600">{site.critical}</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <AdminButton tone={placeMode ? 'primary' : 'default'} onClick={onTogglePlace}>
            {placeMode ? 'Cancel place' : 'Place sensor'}
          </AdminButton>
          <Link href={`/admin/plants/${site.id}`}>
            <AdminButton>Dossier</AdminButton>
          </Link>
          <Link href={`/?facility=${encodeURIComponent(site.id)}`}>
            <AdminButton tone="primary">Open twin</AdminButton>
          </Link>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && <p className="px-4 py-2 text-[12px] text-rose-600">{error}</p>}
        {loading && sensors.length === 0 && (
          <p className="px-4 py-3 text-[12px] text-slate-500">Loading instruments…</p>
        )}

        {mapPlaced.length > 0 && (
          <section>
            <div className="sticky top-0 border-b border-slate-100 bg-white/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 backdrop-blur">
              Map sensors ({mapPlaced.length})
            </div>
            {mapPlaced.map((s) => (
              <SensorRow
                key={s.id}
                sensor={s}
                active={selectedSensorId === s.id}
                onSelect={() => onSelectSensor?.(s.id)}
                onDelete={
                  onDeleteSensor
                    ? () => {
                        void onDeleteSensor(s.id);
                        onRefresh?.();
                      }
                    : undefined
                }
              />
            ))}
          </section>
        )}

        <section>
          <div className="sticky top-0 border-b border-slate-100 bg-white/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 backdrop-blur">
            Twin catalogue ({template.length})
          </div>
          {template.length === 0 && !loading ? (
            <p className="px-4 py-3 text-[12px] text-slate-500">No twin template instruments.</p>
          ) : (
            template.map((s) => (
              <SensorRow
                key={s.id}
                sensor={s}
                active={selectedSensorId === s.id}
                onSelect={() => onSelectSensor?.(s.id)}
              />
            ))
          )}
        </section>
      </div>
    </div>
  );
}

function SensorRow({
  sensor,
  active,
  onSelect,
  onDelete,
}: {
  sensor: PlantSensorRow;
  active?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
}) {
  const severity = (sensor.severity ?? 'offline') as Severity;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-left transition last:border-b-0 ${
        active ? 'bg-cyan-50/80' : 'hover:bg-slate-50'
      }`}
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: SEVERITY_COLOR[severity] }}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-semibold text-slate-800">{sensor.label}</div>
        <div className="mt-0.5 truncate text-[11px] text-slate-500">
          {sensor.id}
          {sensor.lat != null ? ' · on map' : ''}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[13px] font-semibold tabular-nums text-slate-800">
          {sensor.value != null ? formatValue(sensor.value, sensor.decimals) : '—'}
        </div>
        <div className="text-[10px] text-slate-400">{sensor.unit}</div>
      </div>
      {onDelete && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation();
              onDelete();
            }
          }}
          className="ml-1 rounded-lg px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-500 hover:bg-rose-50"
        >
          Del
        </span>
      )}
    </button>
  );
}
