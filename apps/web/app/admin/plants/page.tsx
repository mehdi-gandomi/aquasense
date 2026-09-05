'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/useAuth';
import {
  AdminButton,
  AdminCard,
  AdminCardTitle,
  AdminField,
  AdminInput,
  AdminPageHeader,
  AdminSelect,
} from '@/components/admin/AdminUi';

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
    <div>
      <AdminPageHeader
        title="Plants"
        subtitle="Pin sites on the map. New plants clone the selected twin template."
      />
      {error && <p className="mb-4 text-[13px] text-rose-600">{error}</p>}

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <AdminCard>
          <AdminCardTitle>{editingId ? 'Edit plant' : 'New plant'}</AdminCardTitle>
          <form onSubmit={(e) => void submit(e)}>
            <AdminField label="Client">
              <AdminSelect
                value={form.clientId}
                onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Name">
              <AdminInput
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </AdminField>
            <div className="mb-2.5 grid grid-cols-2 gap-2">
              <AdminField label="Code">
                <AdminInput
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                />
              </AdminField>
              <AdminField label="Template">
                <AdminSelect
                  value={form.kind}
                  onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
                >
                  <option value="wrrf">WRRF twin</option>
                  <option value="pretreatment">Industrial</option>
                  <option value="reservoir">Reservoir</option>
                </AdminSelect>
              </AdminField>
            </div>
            <AdminField label="Address">
              <AdminInput
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </AdminField>
            <div className="mb-2 text-[12px] text-slate-500">
              Pin {form.lat?.toFixed(4) ?? '—'}, {form.lng?.toFixed(4) ?? '—'}
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <PlantMap
                lat={form.lat}
                lng={form.lng}
                onPick={(lat, lng) => setForm((f) => ({ ...f, lat, lng }))}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <AdminButton type="submit" tone="primary">
                {editingId ? 'Save plant' : 'Create plant'}
              </AdminButton>
              {editingId && <AdminButton onClick={() => reset()}>Cancel</AdminButton>}
            </div>
          </form>
        </AdminCard>

        <AdminCard padded={false}>
          <div className="border-b border-slate-100 px-4 py-3">
            <AdminCardTitle>Sites</AdminCardTitle>
          </div>
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
            >
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
                <div className="text-[13px] font-semibold text-slate-800">{row.shortName}</div>
                <div className="mt-0.5 text-[12px] text-slate-500">
                  {row.code} · {row.kind} · {row.address || 'No address'}
                  {row.lat != null ? ` · ${row.lat.toFixed(3)}, ${row.lng?.toFixed(3)}` : ''}
                </div>
              </button>
              <Link href={`/admin/plants/${row.id}`}>
                <AdminButton tone="primary">Dossier</AdminButton>
              </Link>
              <AdminButton
                tone="danger"
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
              </AdminButton>
            </div>
          ))}
        </AdminCard>
      </div>
    </div>
  );
}
