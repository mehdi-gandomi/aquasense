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
import { getSeverity, getValue } from '@/lib/channels';
import { facilityCounts } from '@/lib/health';
import { TelemetryProvider } from '@/components/providers/TelemetryProvider';
import { SensorCard } from '@/components/ui/SensorCard';
import { StatusChip } from '@/components/ui/primitives';
import { EventTape } from '@/components/shell/EventTape';
import { useAuth } from '@/stores/useAuth';
import { useConsole } from '@/stores/useConsole';
import {
  AdminButton,
  AdminCard,
  AdminCardTitle,
  AdminPageHeader,
  AdminStat,
} from '@/components/admin/AdminUi';
import { SensorTrendPanel } from '@/components/charts/SensorTrendPanel';

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
      <div>
        <AdminPageHeader title="Unknown plant" subtitle={id} />
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title={facility.shortName}
        subtitle={`${facility.code} · ${facility.kind} · ${facility.address || 'No address'}`}
      >
        <Link href="/admin">
          <AdminButton>Fleet</AdminButton>
        </Link>
        <Link href="/admin/plants">
          <AdminButton>Edit sites</AdminButton>
        </Link>
        <Link href={`/?facility=${encodeURIComponent(facility.id)}`}>
          <AdminButton tone="primary">Open twin</AdminButton>
        </Link>
      </AdminPageHeader>

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <AdminStat label="Instruments" value={String(sensors.length)} hint={`${counts.nominal} nominal`} tone="cyan" />
        <AdminStat label="Critical" value={String(counts.critical)} hint={`${counts.warning} warnings`} tone="rose" />
        <AdminStat
          label={wqi != null ? 'WQI' : 'Design flow'}
          value={wqi != null ? wqi.toFixed(1) : String(facility.designFlow)}
          hint={wqi != null ? 'Consent index' : 'm³/h'}
          tone="mint"
        />
        <AdminStat label="Client" value={clientName} hint={`${operators.length} operators`} tone="amber" />
      </div>

      {tss && (
        <AdminCard className="mb-5">
          <AdminCardTitle>Effluent trend · {tss.label}</AdminCardTitle>
          <SensorTrendPanel
            soft
            sensor={tss}
            facilityId={id}
            severity={getSeverity(tss.id)}
          />
        </AdminCard>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-2 text-[13px] font-semibold text-slate-600">Live instruments</div>
          {featured.length === 0 ? (
            <AdminCard>
              <p className="text-[13px] text-slate-500">No twin template on this site.</p>
            </AdminCard>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {featured.map((sensor) => (
                <SensorCard key={sensor.id} sensor={sensor} />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <AdminCard padded={false}>
            <div className="border-b border-slate-100 px-4 py-3">
              <AdminCardTitle>Location</AdminCardTitle>
            </div>
            <PlantMap lat={facility.lat} lng={facility.lng} onPick={() => undefined} />
            <div className="px-4 py-2 text-[12px] text-slate-500">
              {facility.lat?.toFixed(4) ?? '—'}, {facility.lng?.toFixed(4) ?? '—'}
            </div>
          </AdminCard>

          <AdminCard padded={false}>
            <div className="border-b border-slate-100 px-4 py-3">
              <AdminCardTitle>Assigned operators</AdminCardTitle>
            </div>
            {operators.length === 0 ? (
              <p className="px-4 py-3 text-[13px] text-slate-500">No client users assigned.</p>
            ) : (
              operators.map((op) => (
                <div key={op.id} className="border-b border-slate-100 px-4 py-3 last:border-b-0">
                  <div className="text-[13px] font-semibold text-slate-800">{op.name}</div>
                  <div className="mt-0.5 text-[12px] text-slate-500">{op.email}</div>
                </div>
              ))
            )}
          </AdminCard>

          <AdminCard padded={false}>
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
              <AdminCardTitle>Active alerts</AdminCardTitle>
              {active[0] && (
                <span className="ml-auto">
                  <StatusChip severity={active[0].severity} />
                </span>
              )}
            </div>
            {active.length === 0 ? (
              <p className="px-4 py-3 text-[13px] text-emerald-600">All stages nominal</p>
            ) : (
              active.slice(0, 6).map((a) => (
                <div key={a.id} className="border-b border-slate-100 px-4 py-3 last:border-b-0">
                  <div className="text-[12px] font-semibold text-slate-700">{a.code}</div>
                  <p className="mt-1 text-[12px] text-slate-500">{a.message}</p>
                </div>
              ))
            )}
          </AdminCard>

          <AdminCard padded={false}>
            <div className="border-b border-slate-100 px-4 py-3">
              <AdminCardTitle>Event stream</AdminCardTitle>
            </div>
            <EventTape limit={8} dense className="max-h-[200px] px-1" />
          </AdminCard>
        </div>
      </div>
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
