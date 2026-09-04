'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { HardButton } from '@/components/ui/primitives';
import { WorkspaceHeader } from '@/components/views/WorkspaceHeader';

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
    <div className="p-4">
      <WorkspaceHeader title="User management" subtitle="Admins see every plant. Client users only see assigned plants." />
      {error && <p className="mt-3 text-[12px] text-critical">{error}</p>}

      <div className="mt-3 grid gap-3 xl:grid-cols-[380px_1fr]">
        <form onSubmit={(e) => void submit(e)} className="slab p-3 shadow-brut">
          <div className="label-xs mb-3">{editingId ? 'Edit user' : 'New user'}</div>
          <label className="mb-2 block">
            <span className="label-xs">Name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full border-2 border-line bg-shell-850 px-2 py-1.5 text-[12px]"
            />
          </label>
          <label className="mb-2 block">
            <span className="label-xs">Email</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="mt-1 w-full border-2 border-line bg-shell-850 px-2 py-1.5 text-[12px]"
            />
          </label>
          <label className="mb-2 block">
            <span className="label-xs">Password</span>
            <input
              required={!editingId}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder={editingId ? 'Leave blank to keep' : undefined}
              className="mt-1 w-full border-2 border-line bg-shell-850 px-2 py-1.5 text-[12px]"
            />
          </label>
          <label className="mb-2 block">
            <span className="label-xs">Role</span>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'ADMIN' | 'CLIENT' }))}
              className="mt-1 w-full border-2 border-line bg-shell-850 px-2 py-1.5 text-[12px]"
            >
              <option value="CLIENT">Client user</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          {form.role === 'CLIENT' && (
            <>
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
              <div className="mb-3">
                <div className="label-xs mb-1">Assigned plants</div>
                <div className="flex max-h-40 flex-col gap-1 overflow-y-auto border-2 border-line p-2">
                  {plants.map((plant) => (
                    <label key={plant.id} className="flex items-center gap-2 text-[12px]">
                      <input
                        type="checkbox"
                        checked={form.plantIds.includes(plant.id)}
                        onChange={() => togglePlant(plant.id)}
                      />
                      {plant.shortName}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
          <div className="flex gap-2">
            <HardButton type="submit" tone="flow">
              {editingId ? 'Save user' : 'Create user'}
            </HardButton>
            {editingId && <HardButton onClick={() => reset()}>Cancel</HardButton>}
          </div>
        </form>

        <div className="slab shadow-brut">
          <div className="border-b-2 border-line px-3 py-2 label-xs">Accounts</div>
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-3 border-b border-line/50 px-3 py-2.5">
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
                <div className="text-[12px] font-semibold uppercase tracking-[0.08em]">{row.name}</div>
                <div className="label-xs mt-0.5 tnum">
                  {row.email} · {row.role}
                  {row.role === 'CLIENT' ? ` · ${row.plantIds.length} plants` : ' · all plants'}
                </div>
              </button>
              <HardButton
                tone="critical"
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
              </HardButton>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
