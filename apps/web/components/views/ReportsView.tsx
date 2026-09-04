'use client';

import { useMemo, useState } from 'react';
import { computeWqi, getFacility, limitsForFacility } from '@aquasense/shared';
import { useAuth } from '@/stores/useAuth';
import { getValue } from '@/lib/channels';
import { facilityCounts } from '@/lib/health';
import { liveBloomAssessment } from '@/lib/bloom';
import { formatClock, formatDate, formatValue } from '@/lib/format';
import { useConsole } from '@/stores/useConsole';
import { HardButton, StatusChip } from '@/components/ui/primitives';
import { WorkspaceHeader } from '@/components/views/WorkspaceHeader';

export function ReportsView() {
  const facilityId = useConsole((s) => s.facilityId);
  const alerts = useConsole((s) => s.alerts);
  const events = useConsole((s) => s.events);
  const equipment = useConsole((s) => s.equipment);
  useConsole((s) => s.tick);

  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);

  const plants = useAuth((s) => s.plants);
  const facility = getFacility(facilityId, plants);
  const counts = facilityCounts(facilityId);
  const limits = limitsForFacility(facilityId);
  const now = new Date();

  const wqi =
    facilityId === 'northfield-wrrf'
      ? computeWqi({
          tss: getValue('EFF-TSS-01'),
          bod: getValue('EFF-BOD-01'),
          nh4: getValue('EFF-NH4-01'),
          turbidity: getValue('EFF-TRB-01'),
          do: getValue('EFF-DO-01'),
        })
      : null;

  const bloom = facilityId === 'highland-reservoir' ? liveBloomAssessment() : null;
  const activeAlerts = alerts.filter((a) => a.state !== 'RESOLVED');
  const overrides = equipment.filter((e) => e.mode !== 'AUTO');

  const snapshot = useMemo(() => {
    const lines = [
      `AQUASENSE SHIFT HANDOVER`,
      `${facility.name} (${facility.code})`,
      `${formatDate(now)}  ${formatClock(now)}`,
      ``,
      `POSTURE`,
      `  Instruments  ${counts.total}  nominal ${counts.nominal}  warn ${counts.warning}  crit ${counts.critical}`,
      `  Open alerts  ${activeAlerts.length}`,
      `  Manual / lockout  ${overrides.length}/${equipment.length}`,
      wqi !== null ? `  Water quality index  ${wqi.toFixed(1)}` : '',
      bloom ? `  HAB level  ${bloom.habLevel}  forecast ${bloom.forecast}  hazard ${bloom.hazardScore}` : '',
      ``,
      `CONSENT`,
      ...limits.map((l) => {
        const v = getValue(l.sensorId);
        return `  ${l.label.padEnd(28)} ${formatValue(v, 2)} ${l.unit}  limit ${l.limit}`;
      }),
      limits.length === 0 ? `  No discharge consent on this facility.` : '',
      ``,
      `OPEN INCIDENTS`,
      ...activeAlerts.map((a) => `  [${a.severity}] ${a.code}  ${a.message}`),
      activeAlerts.length === 0 ? `  None.` : '',
      ``,
      `OPERATOR NOTES`,
      `  ${notes || '(none)'}`,
    ];
    return lines.filter((l) => l !== '').join('\n');
  }, [activeAlerts, bloom, counts, equipment.length, facility, limits, notes, now, overrides.length, wqi]);

  const printReport = () => {
    const win = window.open('', '_blank', 'width=720,height=900');
    if (!win) return;
    win.document.write(`<pre style="font:13px/1.5 'JetBrains Mono',monospace;padding:32px;white-space:pre-wrap">${snapshot.replace(/</g, '&lt;')}</pre>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const downloadApiPdf = async () => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    try {
      const { authHeaders } = await import('@/lib/api');
      const res = await fetch(`${base}/reports/shift`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ facility: facilityId, notes }),
      });
      if (!res.ok) return printReport();
      const data = (await res.json()) as { pdfBase64?: string; id?: number };
      if (data.id) {
        window.open(`${base}/reports/shift/${data.id}/pdf`, '_blank');
        return;
      }
      if (data.pdfBase64) {
        const bytes = Uint8Array.from(atob(data.pdfBase64), (c) => c.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        window.open(url, '_blank');
        return;
      }
      printReport();
    } catch {
      printReport();
    }
  };

  const copyReport = async () => {
    await navigator.clipboard.writeText(snapshot);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="absolute inset-0 overflow-y-auto bg-shell-950">
      <div className="pointer-events-none absolute inset-0 grid-paper opacity-20" />

      <div className="relative p-4">
        <WorkspaceHeader
          title="Shift Handover"
          subtitle="Compose a paper-like brief from live plant posture — PDF engine later"
        >
          <HardButton tone="flow" onClick={copyReport}>
            {copied ? 'Copied' : 'Copy brief'}
          </HardButton>
          <HardButton onClick={downloadApiPdf}>Print / PDF</HardButton>
        </WorkspaceHeader>

        <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_420px]">
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-4">
              {[
                { label: 'Instruments', value: String(counts.total), note: `${counts.nominal} nominal` },
                { label: 'Open alerts', value: String(activeAlerts.length), note: `${counts.critical} critical` },
                {
                  label: wqi !== null ? 'WQI' : 'Capacity',
                  value: wqi !== null ? wqi.toFixed(1) : String(facility.designFlow || '—'),
                  note: wqi !== null ? 'Effluent index' : facility.kind,
                },
                {
                  label: 'Overrides',
                  value: String(overrides.length),
                  note: `${equipment.filter((e) => e.running).length} running`,
                },
              ].map((k) => (
                <div key={k.label} className="slab-solid p-3 shadow-brut">
                  <div className="label-xs">{k.label}</div>
                  <div className="mt-1 text-[24px] font-semibold text-flow tnum">{k.value}</div>
                  <div className="label-xs mt-1 normal-case tracking-normal">{k.note}</div>
                </div>
              ))}
            </div>

            <div className="slab p-3 shadow-brut">
              <div className="label-xs mb-2">Operator notes for incoming shift</div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="Handover remarks — weather, tankering, planned outages…"
                className="w-full resize-none border-2 border-line bg-shell-850 px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-flow"
              />
            </div>

            <div className="slab shadow-brut">
              <div className="border-b-2 border-line bg-shell-850/70 px-3 py-2">
                <span className="label-xs text-slate-300">Open incidents on this brief</span>
              </div>
              {activeAlerts.length === 0 ? (
                <p className="px-3 py-6 label-xs normal-case tracking-normal">No open incidents.</p>
              ) : (
                <div className="divide-y divide-line/50">
                  {activeAlerts.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 px-3 py-2">
                      <StatusChip severity={a.severity} />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">{a.code}</span>
                      <span className="min-w-0 flex-1 truncate text-[11px] text-slate-400">{a.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="slab-solid overflow-hidden shadow-brut">
            <div className="flex items-center justify-between border-b-2 border-line bg-paper px-4 py-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink">
                Print preview
              </span>
              <span className="text-[10px] text-shell-600 tnum">{facility.code}</span>
            </div>
            <pre className="max-h-[70vh] overflow-auto bg-paper p-5 text-[11px] leading-relaxed text-ink tnum">
              {snapshot}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
