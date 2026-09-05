'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  AdminButton,
  AdminCard,
  AdminCardTitle,
  AdminField,
  AdminInput,
  AdminPageHeader,
  AdminSelect,
} from '@/components/admin/AdminUi';

interface ClientRow {
  id: string;
  name: string;
}
interface PlantRow {
  id: string;
  shortName: string;
}
interface UserRow {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CLIENT';
  clientId: string | null;
  plantIds: string[];
  buildingIds?: string[];
}

export default function UsersPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [plants, setPlants] = useState<PlantRow[]>([]);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: 'changeme',
    role: 'CLIENT' as 'ADMIN' | 'CLIENT',
    clientId: '',
    plantIds: [] as string[],
  });

  const load = async () => {
    const [c, b, u] = await Promise.all([
      api<ClientRow[]>('/admin/clients'),
      api<PlantRow[]>('/admin/plants'),
      api<UserRow[]>('/admin/users'),
    ]);
    setClients(c);
    setPlants(b);
    setRows(
      u.map((row) => ({
        ...row,
        plantIds: row.plantIds ?? row.buildingIds ?? [],
      })),
    );
    setForm((f) => ({ ...f, clientId: f.clientId || c[0]?.id || '' }));
  };

  useEffect(() => {
    void load().catch((e) => setError(String(e.message)));
  }, []);

  const reset = (clientId?: string) => {
    setEditingId(null);
    setForm((f) => ({
      name: '',
      email: '',
      password: 'changeme',
      role: 'CLIENT',
      clientId: clientId ?? f.clientId,
      plantIds: [],
    }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await api(`/admin/users/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            role: form.role,
            clientId: form.role === 'CLIENT' ? form.clientId : null,
            plantIds: form.role === 'CLIENT' ? form.plantIds : [],
            ...(form.password ? { password: form.password } : {}),
          }),
        });
      } else {
        await api('/admin/users', { method: 'POST', body: JSON.stringify(form) });
      }
      reset(form.clientId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const togglePlant = (id: string) => {
    setForm((f) => ({
      ...f,
      plantIds: f.plantIds.includes(id)
        ? f.plantIds.filter((x) => x !== id)
        : [...f.plantIds, id],
    }));
  };

  return (
    <div>
      <AdminPageHeader
        title="Users"
        subtitle="Admins see every plant. Client users only see assigned plants."
      />
      {error && <p className="mb-4 text-[13px] text-rose-600">{error}</p>}

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <AdminCard>
          <AdminCardTitle>{editingId ? 'Edit user' : 'New user'}</AdminCardTitle>
          <form onSubmit={(e) => void submit(e)}>
            <AdminField label="Name">
              <AdminInput
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </AdminField>
            <AdminField label="Email">
              <AdminInput
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </AdminField>
            <AdminField label="Password">
              <AdminInput
                required={!editingId}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={editingId ? 'Leave blank to keep' : undefined}
              />
            </AdminField>
            <AdminField label="Role">
              <AdminSelect
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'ADMIN' | 'CLIENT' }))}
              >
                <option value="CLIENT">Client user</option>
                <option value="ADMIN">Admin</option>
              </AdminSelect>
            </AdminField>
            {form.role === 'CLIENT' && (
              <>
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
                <div className="mb-3">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Assigned plants
                  </div>
                  <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                    {plants.map((plant) => (
                      <label key={plant.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-slate-700 hover:bg-white">
                        <input
                          type="checkbox"
                          checked={form.plantIds.includes(plant.id)}
                          onChange={() => togglePlant(plant.id)}
                          className="accent-cyan-600"
                        />
                        {plant.shortName}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="flex gap-2">
              <AdminButton type="submit" tone="primary">
                {editingId ? 'Save user' : 'Create user'}
              </AdminButton>
              {editingId && <AdminButton onClick={() => reset()}>Cancel</AdminButton>}
            </div>
          </form>
        </AdminCard>

        <AdminCard padded={false}>
          <div className="border-b border-slate-100 px-4 py-3">
            <AdminCardTitle>Accounts</AdminCardTitle>
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
                    name: row.name,
                    email: row.email,
                    password: '',
                    role: row.role,
                    clientId: row.clientId ?? clients[0]?.id ?? '',
                    plantIds: row.plantIds ?? row.buildingIds ?? [],
                  });
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="text-[13px] font-semibold text-slate-800">{row.name}</div>
                  <span
                    className={
                      row.role === 'ADMIN'
                        ? 'rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-700'
                        : 'rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700'
                    }
                  >
                    {row.role}
                  </span>
                </div>
                <div className="mt-0.5 text-[12px] text-slate-500">
                  {row.email}
                  {row.role === 'CLIENT' ? ` · ${row.plantIds.length} plants` : ' · all plants'}
                </div>
              </button>
              <AdminButton
                tone="danger"
                onClick={() =>
                  void api(`/admin/users/${row.id}`, { method: 'DELETE' })
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
