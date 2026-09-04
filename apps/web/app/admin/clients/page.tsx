'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { HardButton } from '@/components/ui/primitives';
import { WorkspaceHeader } from '@/components/views/WorkspaceHeader';

interface ClientRow {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  notes: string | null;
}

export default function ClientsPage() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [form, setForm] = useState({ name: '', contact: '', phone: '', notes: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api<ClientRow[]>('/admin/clients')
      .then(setRows)
      .catch((e) => setError(String(e.message)));

  useEffect(() => {
    void load();
  }, []);

  const reset = () => {
    setEditingId(null);
    setForm({ name: '', contact: '', phone: '', notes: '' });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await api(`/admin/clients/${editingId}`, { method: 'PATCH', body: JSON.stringify(form) });
      } else {
        await api('/admin/clients', { method: 'POST', body: JSON.stringify(form) });
      }
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <div className="p-4">
      <WorkspaceHeader title="Client management" subtitle="Companies that own plants" />
      {error && <p className="mt-3 text-[12px] text-critical">{error}</p>}
      <div className="mt-3 grid gap-3 xl:grid-cols-[340px_1fr]">
        <form onSubmit={(e) => void submit(e)} className="slab p-3 shadow-brut">
          <div className="label-xs mb-3">{editingId ? 'Edit client' : 'New client'}</div>
          {(['name', 'contact', 'phone'] as const).map((key) => (
            <label key={key} className="mb-2 block">
              <span className="label-xs">{key}</span>
              <input
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                required={key === 'name'}
                className="mt-1 w-full border-2 border-line bg-shell-850 px-2 py-1.5 text-[12px] outline-none focus:border-flow"
              />
            </label>
          ))}
          <label className="mb-3 block">
            <span className="label-xs">Notes</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="mt-1 w-full border-2 border-line bg-shell-850 px-2 py-1.5 text-[12px] outline-none focus:border-flow"
            />
          </label>
          <div className="flex gap-2">
            <HardButton type="submit" tone="flow">
              {editingId ? 'Save client' : 'Create client'}
            </HardButton>
            {editingId && <HardButton onClick={reset}>Cancel</HardButton>}
          </div>
        </form>

        <div className="slab shadow-brut">
          <div className="border-b-2 border-line px-3 py-2 label-xs">Ledger</div>
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-3 border-b border-line/50 px-3 py-2.5">
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => {
                  setEditingId(row.id);
                  setForm({
                    name: row.name,
                    contact: row.contact ?? '',
                    phone: row.phone ?? '',
                    notes: row.notes ?? '',
                  });
                }}
              >
                <div className="text-[12px] font-semibold uppercase tracking-[0.08em]">{row.name}</div>
                <div className="label-xs mt-0.5 tnum">
                  {row.contact || '—'} · {row.phone || '—'}
                </div>
              </button>
              <HardButton
                tone="critical"
                onClick={() =>
                  void api(`/admin/clients/${row.id}`, { method: 'DELETE' })
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
