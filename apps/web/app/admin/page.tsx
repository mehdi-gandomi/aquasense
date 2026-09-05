'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SEVERITY_COLOR, type Severity } from '@aquasense/shared';
import { api } from '@/lib/api';
import {
  AdminButton,
  AdminCard,
  AdminCardTitle,
  AdminPageHeader,
  AdminStat,
} from '@/components/admin/AdminUi';
import type { FleetSite, MapSensorPin } from '@/components/admin/CatchmentMap';
import { PlantInspectPanel } from '@/components/admin/PlantInspectPanel';
import { AddSensorModal } from '@/components/admin/AddSensorModal';
import { SeverityDonut, SiteAlertBars } from '@/components/charts/Charts';

const CatchmentMap = dynamic(
  () => import('@/components/admin/CatchmentMap').then((m) => m.CatchmentMap),
  { ssr: false },
);

export default function FleetPage() {
  const router = useRouter();
  const [sites, setSites] = useState<FleetSite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);
  const [placeMode, setPlaceMode] = useState(false);
  const [pendingPlace, setPendingPlace] = useState<{ lat: number; lng: number } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(() => {
    return api<FleetSite[]>('/admin/fleet')
      .then(setSites)
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'));
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 4000);
    return () => clearInterval(t);
  }, [load, refreshKey]);

  const selectedSite = useMemo(
    () => sites.find((s) => s.id === selectedPlantId) ?? null,
    [sites, selectedPlantId],
  );

  const sensorPins: MapSensorPin[] = useMemo(() => {
    if (!selectedSite) return [];
    return (selectedSite.mapSensors ?? [])
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => ({
        id: s.id,
        facilityId: selectedSite.id,
        label: s.label,
        parameter: s.parameter,
        unit: s.unit,
        lat: s.lat,
        lng: s.lng,
        source: s.source,
      }));
  }, [selectedSite]);

  const flagged = sites.filter((s) => s.severity === 'warning' || s.severity === 'critical').length;
  const critical = sites.reduce((n, s) => n + (s.critical || 0), 0);
  const instruments = sites.reduce((n, s) => n + (s.instruments || 0), 0);

  const severityCounts = useMemo(() => {
    const counts: Partial<Record<Severity, number>> = {};
    for (const site of sites) {
      const key = (site.severity as Severity) || 'offline';
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [sites]);

  const bump = () => setRefreshKey((n) => n + 1);

  return (
    <div>
      <AdminPageHeader
        title="Catchment fleet"
        subtitle="Inspect plants, live instruments, and place sensors on the map"
      />
      {error && <p className="mb-4 text-[13px] text-rose-600">{error}</p>}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Plants" value={String(sites.length)} hint="Registered sites" tone="cyan" />
        <AdminStat label="Flagged" value={String(flagged)} hint="Warning or critical" tone="amber" />
        <AdminStat label="Critical pts" value={String(critical)} hint="Active critical tags" tone="rose" />
        <AdminStat label="Instruments" value={String(instruments)} hint="Live points" tone="mint" />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <AdminCard>
          <SeverityDonut counts={severityCounts} soft height={210} />
        </AdminCard>
        <AdminCard>
          <SiteAlertBars
            soft
            height={210}
            sites={sites.map((s) => ({
              id: s.id,
              shortName: s.shortName,
              warning: s.warning || 0,
              critical: s.critical || 0,
            }))}
            onSelect={(id) => {
              setSelectedPlantId(id);
              setPlaceMode(false);
            }}
          />
        </AdminCard>
      </div>

      <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_360px]">
        <AdminCard padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
            <AdminCardTitle>Catchment map</AdminCardTitle>
            {selectedSite && (
              <AdminButton
                tone={placeMode ? 'primary' : 'default'}
                onClick={() => {
                  setPlaceMode((v) => !v);
                  setPendingPlace(null);
                }}
              >
                {placeMode ? 'Cancel place' : 'Place sensor'}
              </AdminButton>
            )}
          </div>
          <CatchmentMap
            sites={sites}
            selectedPlantId={selectedPlantId}
            placeMode={placeMode && !!selectedPlantId}
            sensorPins={sensorPins}
            selectedSensorId={selectedSensorId}
            onSelectPlant={(id) => {
              setSelectedPlantId(id);
              setSelectedSensorId(null);
              setPlaceMode(false);
            }}
            onSelectSensor={setSelectedSensorId}
            onPlaceClick={(lat, lng) => {
              if (!selectedPlantId) return;
              setPendingPlace({ lat, lng });
            }}
            onSensorMoved={(id, lat, lng) => {
              if (!selectedPlantId) return;
              void api(`/admin/plants/${encodeURIComponent(selectedPlantId)}/sensors/${encodeURIComponent(id)}`, {
                method: 'PATCH',
                body: JSON.stringify({ lat, lng }),
              }).then(bump);
            }}
            className="h-[520px] w-full border-0"
          />
        </AdminCard>

        <AdminCard padded={false} className="flex max-h-[580px] min-h-[520px] flex-col overflow-hidden">
          <PlantInspectPanel
            site={selectedSite}
            selectedSensorId={selectedSensorId}
            placeMode={placeMode}
            onTogglePlace={() => {
              if (!selectedPlantId) return;
              setPlaceMode((v) => !v);
              setPendingPlace(null);
            }}
            onSelectSensor={setSelectedSensorId}
            onDeleteSensor={async (id) => {
              if (!selectedPlantId) return;
              await api(
                `/admin/plants/${encodeURIComponent(selectedPlantId)}/sensors/${encodeURIComponent(id)}`,
                { method: 'DELETE' },
              );
              bump();
            }}
            onRefresh={bump}
          />
        </AdminCard>
      </div>

      <AdminCard padded={false}>
        <div className="border-b border-slate-100 px-4 py-3">
          <AdminCardTitle>Sites</AdminCardTitle>
        </div>
        {sites.map((site) => (
          <div
            key={site.id}
            className={`flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 ${
              selectedPlantId === site.id ? 'bg-cyan-50/60' : ''
            }`}
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: SEVERITY_COLOR[site.severity as Severity] }}
            />
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => {
                setSelectedPlantId(site.id);
                setPlaceMode(false);
              }}
            >
              <div className="truncate text-[13px] font-semibold text-slate-800">{site.shortName}</div>
              <div className="mt-0.5 text-[12px] text-slate-500">
                {site.code} · {site.kind} · {site.instruments} pts
                {(site.mapSensors?.length ?? 0) > 0 ? ` · ${site.mapSensors!.length} map` : ''}
              </div>
            </button>
            <AdminButton
              tone={site.critical ? 'danger' : site.warning ? 'default' : 'primary'}
              onClick={() => router.push(`/admin/plants/${site.id}`)}
            >
              {site.critical + site.warning || 'Open'}
            </AdminButton>
          </div>
        ))}
      </AdminCard>

      {pendingPlace && selectedPlantId && (
        <AddSensorModal
          plantId={selectedPlantId}
          lat={pendingPlace.lat}
          lng={pendingPlace.lng}
          onClose={() => setPendingPlace(null)}
          onCreated={() => {
            setPlaceMode(false);
            bump();
          }}
        />
      )}
    </div>
  );
}
