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
  AdminTextarea,
} from '@/components/admin/AdminUi';

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
    <div>
      <AdminPageHeader title="Clients" subtitle="Companies that own plants" />
      {error && <p className="mb-4 text-[13px] text-rose-600">{error}</p>}

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <AdminCard>
          <AdminCardTitle>{editingId ? 'Edit client' : 'New client'}</AdminCardTitle>
          <form onSubmit={(e) => void submit(e)}>
            {(['name', 'contact', 'phone'] as const).map((key) => (
              <AdminField key={key} label={key}>
                <AdminInput
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  required={key === 'name'}
                />
              </AdminField>
            ))}
            <AdminField label="Notes">
              <AdminTextarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </AdminField>
            <div className="mt-3 flex gap-2">
              <AdminButton type="submit" tone="primary">
                {editingId ? 'Save client' : 'Create client'}
              </AdminButton>
              {editingId && <AdminButton onClick={reset}>Cancel</AdminButton>}
            </div>
          </form>
        </AdminCard>

        <AdminCard padded={false}>
          <div className="border-b border-slate-100 px-4 py-3">
            <AdminCardTitle>Ledger</AdminCardTitle>
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
                    contact: row.contact ?? '',
                    phone: row.phone ?? '',
                    notes: row.notes ?? '',
                  });
                }}
              >
                <div className="text-[13px] font-semibold text-slate-800">{row.name}</div>
                <div className="mt-0.5 text-[12px] text-slate-500">
                  {row.contact || '—'} · {row.phone || '—'}
                </div>
              </button>
              <AdminButton
                tone="danger"
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
              </AdminButton>
            </div>
          ))}
        </AdminCard>
      </div>
    </div>
  );
}
