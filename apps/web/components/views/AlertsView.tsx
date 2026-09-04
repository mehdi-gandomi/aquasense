'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SEVERITY_COLOR, getSensor, type Alert } from '@aquasense/shared';
import { formatTimeOfDay, formatValue, relativeTime } from '@/lib/format';
import { useConsole } from '@/stores/useConsole';
import { HardButton, SeverityDot, StatusChip } from '@/components/ui/primitives';
import { EventTape } from '@/components/shell/EventTape';
import { WorkspaceHeader } from '@/components/views/WorkspaceHeader';
import { sendAlertAction } from '@/components/providers/TelemetryProvider';

type Filter = 'all' | 'ACTIVE' | 'ACKED' | 'RESOLVED' | 'critical' | 'warning';

export function AlertsView() {
  const alerts = useConsole((s) => s.alerts);
  const select = useConsole((s) => s.select);
  const ackAlert = useConsole((s) => s.ackAlert);
  const resolveAlert = useConsole((s) => s.resolveAlert);
  const pushEvent = useConsole((s) => s.pushEvent);
  const facilityId = useConsole((s) => s.facilityId);
  useConsole((s) => s.tick);

  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (filter === 'all') return true;
      if (filter === 'critical' || filter === 'warning') return a.severity === filter;
      return a.state === filter;
    });
  }, [alerts, filter]);

  const active = alerts.filter((a) => a.state === 'ACTIVE');
  const crit = active.filter((a) => a.severity === 'critical').length;

  const act = (alert: Alert, kind: 'ack' | 'resolve') => {
    if (kind === 'ack') ackAlert(alert.id);
    else resolveAlert(alert.id);
    void sendAlertAction(alert.id, kind);
    pushEvent({
      id: `${kind}-${alert.id}-${Date.now()}`,
      facilityId,
      level: kind === 'ack' ? 'AUTO' : 'INFO',
      source: 'OPS',
      message: `${kind === 'ack' ? 'Acknowledged' : 'Resolved'} ${alert.code}`,
      at: Date.now(),
    });
  };

  return (
    <div className="absolute inset-0 overflow-y-auto bg-shell-950">
      <div className="pointer-events-none absolute inset-0 grid-paper opacity-20" />

      <div className="relative p-4">
        <WorkspaceHeader
          title="Alert Board"
          subtitle={`${active.length} active · ${crit} critical · punch-tape of the shift`}
        >
          {(['all', 'ACTIVE', 'ACKED', 'critical', 'warning'] as const).map((f) => (
            <HardButton key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f}
            </HardButton>
          ))}
        </WorkspaceHeader>

        <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_360px]">
          <div className="slab shadow-brut">
            <div className="flex items-center gap-2 border-b-2 border-line bg-shell-850/70 px-3 py-2">
              <span className="label-xs text-slate-300">Incident ledger</span>
              <span className="label-xs ml-auto tnum">{filtered.length} rows</span>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16">
                <div className="flex size-12 items-center justify-center border-2 border-nominal/40 bg-nominal/5">
                  <span className="text-nominal">OK</span>
                </div>
                <p className="label-xs normal-case tracking-normal">
                  No incidents match this filter. The board is quiet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-line/50">
                {filtered.map((alert) => {
                  const sensor = alert.sensorId ? getSensor(alert.sensorId) : undefined;
                  return (
                    <div
                      key={alert.id}
                      className={clsx(
                        'flex flex-wrap items-center gap-3 px-3 py-2.5',
                        alert.severity === 'critical' && alert.state === 'ACTIVE' && 'hazard-stripe',
                      )}
                    >
                      <span
                        className="w-[3px] self-stretch"
                        style={{ backgroundColor: SEVERITY_COLOR[alert.severity] }}
                      />
                      <SeverityDot severity={alert.severity} pulse={alert.state === 'ACTIVE'} />

                      <button
                        type="button"
                        onClick={() => select({ kind: 'alert', id: alert.id })}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-100">
                            {alert.code}
                          </span>
                          <StatusChip severity={alert.severity} />
                          <span className="label-xs">{alert.state}</span>
                        </div>
                        <p className="mt-1 text-[12px] leading-snug text-slate-300">{alert.message}</p>
                        <div className="label-xs mt-1 tnum">
                          {alert.sensorId} · {formatTimeOfDay(alert.raisedAt)} ·{' '}
                          {relativeTime(alert.raisedAt)}
                          {sensor && alert.value !== undefined
                            ? ` · ${formatValue(alert.value, sensor.decimals)} ${sensor.unit}`
                            : ''}
                        </div>
                      </button>

                      <div className="flex gap-1.5">
                        <HardButton
                          tone="warning"
                          disabled={alert.state !== 'ACTIVE'}
                          onClick={() => act(alert, 'ack')}
                        >
                          Ack
                        </HardButton>
                        <HardButton
                          tone="flow"
                          disabled={alert.state === 'RESOLVED'}
                          onClick={() => act(alert, 'resolve')}
                        >
                          Close
                        </HardButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="slab shadow-brut">
            <div className="flex items-center gap-2 border-b-2 border-line bg-shell-850/70 px-3 py-2">
              <span className="size-1.5 animate-alarm bg-flow" />
              <span className="label-xs text-slate-300">Punch-tape</span>
            </div>
            <EventTape limit={80} className="max-h-[640px] px-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
