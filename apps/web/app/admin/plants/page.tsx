'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/useAuth';
import { HardButton } from '@/components/ui/primitives';
import { WorkspaceHeader } from '@/components/views/WorkspaceHeader';

const PlantMap = dynamic(
  () => import('@/components/admin/PlantMap').then((m) => m.PlantMap),
  { ssr: false },
);

interface ClientRow {
  id: string;
  name: string;
}

interface PlantRow {
  id: string;
  name: string;
  shortName: string;
  code: string;
  kind: string;
  clientId: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export default function PlantsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [rows, setRows] = useState<PlantRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientId: '',
    name: '',
    shortName: '',
    code: '',
    kind: 'wrrf',
    address: '',
    lat: undefined as number | undefined,
    lng: undefined as number | undefined,
  });
  const refreshAuth = useAuth((s) => s.refresh);

  const load = async () => {
    const [c, plants] = await Promise.all([
      api<ClientRow[]>('/admin/clients'),
      api<PlantRow[]>('/admin/plants'),
    ]);
    setClients(c);
    setRows(plants);
    setForm((f) => ({ ...f, clientId: f.clientId || c[0]?.id || '' }));
    await refreshAuth();
  };

  useEffect(() => {
    void load().catch((e) => setError(String(e.message)));
  }, []);

  const reset = (clientId?: string) => {
    setEditingId(null);
    setForm((f) => ({
      clientId: clientId ?? f.clientId,
      name: '',
      shortName: '',
      code: '',
      kind: 'wrrf',
      address: '',
      lat: undefined,
      lng: undefined,
    }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await api(`/admin/plants/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            clientId: form.clientId,
            name: form.name,
            shortName: form.shortName || undefined,
            code: form.code || undefined,
            kind: form.kind,
            address: form.address || undefined,
            lat: form.lat,
            lng: form.lng,
          }),
        });
      } else {
        await api('/admin/plants', {
          method: 'POST',
          body: JSON.stringify({ ...form, templateKind: form.kind }),
        });
      }
      reset(form.clientId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <div className="p-4">
      <WorkspaceHeader
        title="Plant management"
        subtitle="Click the map to pin a site. New sites clone the selected plant template."
      />
      {error && <p className="mt-3 text-[12px] text-critical">{error}</p>}

      <div className="mt-3 grid gap-3 xl:grid-cols-[420px_1fr]">
        <form onSubmit={(e) => void submit(e)} className="slab p-3 shadow-brut">
          <div className="label-xs mb-3">{editingId ? 'Edit plant' : 'New plant'}</div>
          <label className="mb-2 block">
            <span className="label-xs">Client</span>
            <select
              value={form.clientId}
              onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
              className="mt-1 w-full border-2 border-line bg-shell-850 px-2 py-1.5 text-[12px]"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="mb-2 block">
            <span className="label-xs">Name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full border-2 border-line bg-shell-850 px-2 py-1.5 text-[12px] outline-none focus:border-flow"
            />
          </label>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <label>
              <span className="label-xs">Code</span>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className="mt-1 w-full border-2 border-line bg-shell-850 px-2 py-1.5 text-[12px]"
              />
            </label>
            <label>
              <span className="label-xs">Template</span>
              <select
                value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
                className="mt-1 w-full border-2 border-line bg-shell-850 px-2 py-1.5 text-[12px]"
              >
                <option value="wrrf">WRRF twin</option>
                <option value="pretreatment">Industrial</option>
                <option value="reservoir">Reservoir</option>
              </select>
            </label>
          </div>
          <label className="mb-2 block">
            <span className="label-xs">Address</span>
            <input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="mt-1 w-full border-2 border-line bg-shell-850 px-2 py-1.5 text-[12px]"
            />
          </label>
          <div className="mb-2 label-xs tnum">
            Pin {form.lat?.toFixed(4) ?? '—'}, {form.lng?.toFixed(4) ?? '—'}
          </div>
          <PlantMap
            lat={form.lat}
            lng={form.lng}
            onPick={(lat, lng) => setForm((f) => ({ ...f, lat, lng }))}
          />
          <div className="mt-3 flex gap-2">
            <HardButton type="submit" tone="flow">
              {editingId ? 'Save plant' : 'Create plant'}
            </HardButton>
            {editingId && <HardButton onClick={() => reset()}>Cancel</HardButton>}
          </div>
        </form>

        <div className="slab shadow-brut">
          <div className="border-b-2 border-line px-3 py-2 label-xs">Sites</div>
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-3 border-b border-line/50 px-3 py-2.5">
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => {
                  setEditingId(row.id);
                  setForm({
                    clientId: row.clientId,
                    name: row.name,
                    shortName: row.shortName,
                    code: row.code,
                    kind: row.kind,
                    address: row.address ?? '',
                    lat: row.lat,
                    lng: row.lng,
                  });
                }}
              >
                <div className="text-[12px] font-semibold uppercase tracking-[0.08em]">{row.shortName}</div>
                <div className="label-xs mt-0.5 normal-case tracking-normal">
                  {row.code} · {row.kind} · {row.address || 'No address'}
                  {row.lat != null ? ` · ${row.lat.toFixed(3)}, ${row.lng?.toFixed(3)}` : ''}
                </div>
              </button>
              <Link href={`/admin/plants/${row.id}`}>
                <HardButton tone="flow">Dossier</HardButton>
              </Link>
              <HardButton
                tone="critical"
                onClick={() =>
                  void api(`/admin/plants/${row.id}`, { method: 'DELETE' })
                    .then(() => {
                      if (editingId === row.id) reset();
                      return load();
                    })
                    .catch((e) => setError(String(e.message)))
                }
              >
                Remove
              </HardButton>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
