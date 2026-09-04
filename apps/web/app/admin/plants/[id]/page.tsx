'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import {
  computeWqi,
  sensorsForFacility,
  type Alert,
  type Facility,
} from '@aquasense/shared';
import { api } from '@/lib/api';
import { getValue } from '@/lib/channels';
import { facilityCounts } from '@/lib/health';
import { TelemetryProvider } from '@/components/providers/TelemetryProvider';
import { SensorCard } from '@/components/ui/SensorCard';
import { HardButton, StatusChip } from '@/components/ui/primitives';
import { WorkspaceHeader } from '@/components/views/WorkspaceHeader';
import { EventTape } from '@/components/shell/EventTape';
import { useAuth } from '@/stores/useAuth';
import { useConsole } from '@/stores/useConsole';

const PlantMap = dynamic(
  () => import('@/components/admin/PlantMap').then((m) => m.PlantMap),
  { ssr: false },
);

interface ClientRow {
  id: string;
  name: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  plantIds: string[];
  buildingIds?: string[];
}

function DossierInner({ id }: { id: string }) {
  const setFacility = useConsole((s) => s.setFacility);
  const alerts = useConsole((s) => s.alerts);
  const plants = useAuth((s) => s.plants);
  useConsole((s) => s.tick);

  const [clientName, setClientName] = useState('—');
  const [operators, setOperators] = useState<UserRow[]>([]);

  const facility = useMemo(
    () => plants.find((p) => p.id === id) as Facility | undefined,
    [plants, id],
  );

  useEffect(() => {
    setFacility(id);
  }, [id, setFacility]);

  useEffect(() => {
    void api<ClientRow[]>('/admin/clients').then((rows) => {
      setClientName(rows.find((c) => c.id === facility?.clientId)?.name ?? '—');
    });
    void api<UserRow[]>('/admin/users').then((users) => {
      setOperators(
        users.filter((u) => {
          const assigned = u.plantIds ?? u.buildingIds ?? [];
          return u.role === 'CLIENT' && assigned.includes(id);
        }),
      );
    });
  }, [facility?.clientId, id]);

  const sensors = sensorsForFacility(id);
  const counts = facilityCounts(id);
  const active = alerts.filter((a: Alert) => a.state === 'ACTIVE');
  const tss = sensors.find((s) => s.id.endsWith('EFF-TSS-01'));
  const wqi =
    facility?.kind === 'wrrf'
      ? computeWqi({
          tss: getValue(tss?.id ?? 'EFF-TSS-01'),
          bod: getValue(sensors.find((s) => s.id.endsWith('EFF-BOD-01'))?.id ?? 'EFF-BOD-01'),
          nh4: getValue(sensors.find((s) => s.id.endsWith('EFF-NH4-01'))?.id ?? 'EFF-NH4-01'),
          turbidity: getValue(sensors.find((s) => s.id.endsWith('EFF-TRB-01'))?.id ?? 'EFF-TRB-01'),
          do: getValue(sensors.find((s) => s.id.endsWith('EFF-DO-01'))?.id ?? 'EFF-DO-01'),
        })
      : null;

  const featured = [
    ...sensors.filter((s) => s.pinned),
    ...sensors.filter((s) => !s.pinned),
  ]
    .filter((s, i, all) => all.findIndex((x) => x.id === s.id) === i)
    .slice(0, 9);

  if (!facility) {
    return (
      <div className="p-4">
        <WorkspaceHeader title="Unknown plant" subtitle={id} />
      </div>
    );
  }

  return (
    <div className="p-4">
      <WorkspaceHeader
        title={facility.shortName}
        subtitle={`${facility.code} · ${facility.kind} · ${facility.address || 'No address'}`}
      >
        <Link href="/admin">
          <HardButton>Fleet</HardButton>
        </Link>
        <Link href="/admin/plants">
          <HardButton>Edit sites</HardButton>
        </Link>
        <Link href={`/?facility=${encodeURIComponent(facility.id)}`}>
          <HardButton tone="flow">Open twin</HardButton>
        </Link>
      </WorkspaceHeader>

      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <Kpi label="Instruments" value={String(sensors.length)} note={`${counts.nominal} nominal`} />
        <Kpi label="Critical" value={String(counts.critical)} note={`${counts.warning} warnings`} />
        <Kpi
          label={wqi != null ? 'WQI' : 'Design flow'}
          value={wqi != null ? wqi.toFixed(1) : String(facility.designFlow)}
          note={wqi != null ? 'Consent index' : 'm3/h'}
        />
        <Kpi label="Client" value={clientName} note={`${operators.length} operators assigned`} />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_320px]">
        <div>
          <div className="label-xs mb-2">Live instruments</div>
          {featured.length === 0 ? (
            <div className="slab p-6 shadow-brut">
              <p className="text-[12px] text-slate-400">No twin template on this site.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {featured.map((sensor) => (
                <SensorCard key={sensor.id} sensor={sensor} />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="slab overflow-hidden shadow-brut">
            <div className="border-b-2 border-line px-3 py-2 label-xs">Location</div>
            <PlantMap lat={facility.lat} lng={facility.lng} onPick={() => undefined} />
            <div className="px-3 py-2 label-xs tnum">
              {facility.lat?.toFixed(4) ?? '—'}, {facility.lng?.toFixed(4) ?? '—'}
            </div>
          </div>

          <div className="slab shadow-brut">
            <div className="border-b-2 border-line px-3 py-2 label-xs">Assigned operators</div>
            {operators.length === 0 ? (
              <p className="px-3 py-3 text-[12px] text-slate-400">No client users assigned.</p>
            ) : (
              operators.map((op) => (
                <div key={op.id} className="border-b border-line/50 px-3 py-2">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.08em]">{op.name}</div>
                  <div className="label-xs mt-0.5 tnum">{op.email}</div>
                </div>
              ))
            )}
          </div>

          <div className="slab shadow-brut">
            <div className="flex items-center gap-2 border-b-2 border-line px-3 py-2">
              <span className="label-xs">Active alerts</span>
              {active[0] && (
                <span className="ml-auto">
                  <StatusChip severity={active[0].severity} />
                </span>
              )}
            </div>
            {active.length === 0 ? (
              <p className="px-3 py-3 text-[12px] text-nominal">All stages nominal</p>
            ) : (
              active.slice(0, 6).map((a) => (
                <div key={a.id} className="border-b border-line/50 px-3 py-2">
                  <div className="label-xs tnum">{a.code}</div>
                  <p className="mt-1 text-[11px] text-slate-400">{a.message}</p>
                </div>
              ))
            )}
          </div>

          <div className="slab shadow-brut">
            <div className="border-b-2 border-line px-3 py-2 label-xs">Event stream</div>
            <EventTape limit={8} dense className="max-h-[200px] px-1" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="slab px-3 py-2 shadow-brut">
      <div className="label-xs">{label}</div>
      <div className="mt-1 truncate text-[22px] font-semibold leading-none tnum">{value}</div>
      <div className="label-xs mt-1.5 normal-case tracking-normal">{note}</div>
    </div>
  );
}

export default function PlantDossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <TelemetryProvider>
      <DossierInner id={id} />
    </TelemetryProvider>
  );
}
