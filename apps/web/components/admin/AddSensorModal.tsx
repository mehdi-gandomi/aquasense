'use client';

import { useEffect, useState } from 'react';
import type { SensorDef } from '@aquasense/shared';
import { api } from '@/lib/api';
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminSelect,
} from '@/components/admin/AdminUi';

type Mode = 'catalogue' | 'custom';

export function AddSensorModal({
  plantId,
  lat,
  lng,
  onClose,
  onCreated,
}: {
  plantId: string;
  lat: number;
  lng: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [mode, setMode] = useState<Mode>('catalogue');
  const [catalogue, setCatalogue] = useState<SensorDef[]>([]);
  const [templateSensorId, setTemplateSensorId] = useState('');
  const [label, setLabel] = useState('');
  const [parameter, setParameter] = useState('custom');
  const [unit, setUnit] = useState('');
  const [min, setMin] = useState('0');
  const [max, setMax] = useState('100');
  const [warnHigh, setWarnHigh] = useState('');
  const [critHigh, setCritHigh] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<SensorDef[]>(`/admin/plants/${encodeURIComponent(plantId)}/catalogue`)
      .then((rows) => {
        setCatalogue(rows);
        if (rows[0]) setTemplateSensorId(rows[0].id);
      })
      .catch(() => setCatalogue([]));
  }, [plantId]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'catalogue') {
        if (!templateSensorId) throw new Error('Pick a catalogue instrument');
        await api(`/admin/plants/${encodeURIComponent(plantId)}/sensors`, {
          method: 'POST',
          body: JSON.stringify({
            mode: 'catalogue',
            templateSensorId,
            lat,
            lng,
            label: label || undefined,
          }),
        });
      } else {
        if (!label.trim()) throw new Error('Label is required');
        if (!unit.trim()) throw new Error('Unit is required');
        await api(`/admin/plants/${encodeURIComponent(plantId)}/sensors`, {
          method: 'POST',
          body: JSON.stringify({
            mode: 'custom',
            label: label.trim(),
            parameter: parameter.trim() || 'custom',
            unit: unit.trim(),
            min: Number(min),
            max: Number(max),
            warnHigh: warnHigh === '' ? undefined : Number(warnHigh),
            critHigh: critHigh === '' ? undefined : Number(critHigh),
            lat,
            lng,
          }),
        });
      }
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <div className="text-[14px] font-semibold text-slate-800">Place sensor</div>
            <div className="mt-0.5 text-[11px] tabular-nums text-slate-500">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </div>
          </div>
          <AdminButton onClick={onClose}>Close</AdminButton>
        </div>

        <div className="flex gap-1 border-b border-slate-100 px-4 pt-3">
          {(['catalogue', 'custom'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-t-lg px-3 py-2 text-[12px] font-semibold capitalize ${
                mode === m
                  ? 'bg-cyan-50 text-cyan-700'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-4 py-4">
          {mode === 'catalogue' ? (
            <>
              <AdminField label="Catalogue instrument">
                <AdminSelect
                  value={templateSensorId}
                  onChange={(e) => setTemplateSensorId(e.target.value)}
                >
                  {catalogue.length === 0 && <option value="">No catalogue entries</option>}
                  {catalogue.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} ({s.id}) · {s.unit}
                    </option>
                  ))}
                </AdminSelect>
              </AdminField>
              <AdminField label="Override label (optional)">
                <AdminInput
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Keep catalogue label"
                />
              </AdminField>
            </>
          ) : (
            <>
              <AdminField label="Label">
                <AdminInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Effluent TSS" />
              </AdminField>
              <div className="grid grid-cols-2 gap-3">
                <AdminField label="Parameter">
                  <AdminInput value={parameter} onChange={(e) => setParameter(e.target.value)} />
                </AdminField>
                <AdminField label="Unit">
                  <AdminInput value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="mg/L" />
                </AdminField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <AdminField label="Min">
                  <AdminInput value={min} onChange={(e) => setMin(e.target.value)} type="number" />
                </AdminField>
                <AdminField label="Max">
                  <AdminInput value={max} onChange={(e) => setMax(e.target.value)} type="number" />
                </AdminField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <AdminField label="Warn high">
                  <AdminInput value={warnHigh} onChange={(e) => setWarnHigh(e.target.value)} type="number" />
                </AdminField>
                <AdminField label="Crit high">
                  <AdminInput value={critHigh} onChange={(e) => setCritHigh(e.target.value)} type="number" />
                </AdminField>
              </div>
            </>
          )}
          {error && <p className="text-[12px] text-rose-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <AdminButton onClick={onClose}>Cancel</AdminButton>
          <AdminButton tone="primary" disabled={busy} onClick={() => void submit()}>
            {busy ? 'Saving…' : 'Create sensor'}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
