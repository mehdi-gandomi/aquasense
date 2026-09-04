'use client';

import clsx from 'clsx';
import {
  SEVERITY_COLOR,
  equipmentForNode,
  getFacility,
  getNode,
  getSensor,
  rangeFraction,
  sensorsForNode,
  type EquipmentDef,
  type EquipmentMode,
} from '@aquasense/shared';
import { useAuth } from '@/stores/useAuth';
import { getChannel, getValue, series } from '@/lib/channels';
import { nodeSeverity } from '@/lib/health';
import { formatValue, relativeTime } from '@/lib/format';
import { useConsole } from '@/stores/useConsole';
import { sendAlertAction, sendEquipmentCommand } from '@/components/providers/TelemetryProvider';
import { HardButton, RangeBar, SeverityDot, Sparkline, StatusChip } from '@/components/ui/primitives';

function DeckSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b-2 border-line">
      <div className="bg-shell-850/60 px-3 py-1.5">
        <span className="label-xs">{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

function EquipmentControl({ item }: { item: EquipmentDef }) {
  const patchEquipment = useConsole((s) => s.patchEquipment);

  const apply = async (patch: Partial<EquipmentDef>, body: Record<string, unknown>) => {
    // Optimistic: the deck must feel instant even when the core is offline.
    patchEquipment({ ...item, ...patch });
    const result = (await sendEquipmentCommand(item.id, body)) as EquipmentDef | null;
    if (result) patchEquipment(result);
  };

  const locked = item.mode === 'LOCKOUT';
  const pct =
    item.setpointMax > item.setpointMin
      ? (item.setpoint - item.setpointMin) / (item.setpointMax - item.setpointMin)
      : 0;

  return (
    <div
      className={clsx(
        'border-2 p-2.5',
        locked ? 'border-critical/50 hazard-stripe' : 'border-line',
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={clsx('mt-1 size-2 shrink-0', item.running ? 'bg-nominal' : 'bg-offline')}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-100">
            {item.label}
          </div>
          <div className="label-xs mt-0.5 tnum">{item.id}</div>
        </div>
        <span
          className={clsx(
            'border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]',
            item.mode === 'AUTO' && 'border-nominal/50 text-nominal',
            item.mode === 'MANUAL' && 'border-warning/50 text-warning',
            item.mode === 'LOCKOUT' && 'border-critical/50 text-critical',
          )}
        >
          {item.mode}
        </span>
      </div>

      <div className="mt-2.5 flex items-baseline justify-between">
        <span className="label-xs">Setpoint</span>
        <span className="text-base font-semibold leading-none text-flow tnum">
          {formatValue(item.setpoint, item.setpointUnit === 'rpm' ? 3 : 1)}
          <span className="ml-1 text-[10px] text-faint">{item.setpointUnit}</span>
        </span>
      </div>

      <input
        type="range"
        min={item.setpointMin}
        max={item.setpointMax}
        step={(item.setpointMax - item.setpointMin) / 100}
        value={item.setpoint}
        disabled={locked}
        onChange={(e) =>
          void apply(
            { setpoint: Number(e.target.value) },
            { command: 'setpoint', value: Number(e.target.value) },
          )
        }
        className="mt-2 h-1 w-full cursor-pointer appearance-none bg-shell-800 accent-flow disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: `linear-gradient(to right, var(--color-flow) ${pct * 100}%, var(--color-shell-800) ${pct * 100}%)`,
        }}
      />

      <div className="mt-2.5 flex flex-wrap gap-1">
        <HardButton
          tone={item.running ? 'default' : 'flow'}
          disabled={locked}
          onClick={() =>
            void apply(
              { running: !item.running },
              { command: item.running ? 'stop' : 'start' },
            )
          }
          className="disabled:opacity-40"
        >
          {item.running ? 'Stop' : 'Engage'}
        </HardButton>

        {(['AUTO', 'MANUAL', 'LOCKOUT'] as EquipmentMode[]).map((mode) => (
          <HardButton
            key={mode}
            active={item.mode === mode}
            tone={mode === 'LOCKOUT' ? 'critical' : 'default'}
            onClick={() =>
              void apply(
                { mode, running: mode === 'LOCKOUT' ? false : item.running },
                { command: 'mode', value: mode },
              )
            }
          >
            {mode}
          </HardButton>
        ))}
      </div>
    </div>
  );
}

function SensorDetail({ sensorId }: { sensorId: string }) {
  const sensor = getSensor(sensorId);
  if (!sensor) return null;

  const channel = getChannel(sensorId);
  const value = getValue(sensorId);
  const severity = channel?.severity ?? 'offline';
  const points = series(sensorId, 90);

  return (
    <>
      <DeckSection title="Instrument">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[13px] font-bold uppercase tracking-[0.1em] text-white">
              {sensor.label}
            </div>
            <div className="label-xs mt-1 tnum">{sensor.id}</div>
          </div>
          <StatusChip severity={severity} />
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <span
            className="text-4xl font-semibold leading-none tnum"
            style={{ color: SEVERITY_COLOR[severity] }}
          >
            {formatValue(value, sensor.decimals)}
          </span>
          <span className="text-xs text-muted">{sensor.unit}</span>
        </div>

        <div className="mt-3">
          <RangeBar
            fraction={rangeFraction(sensor, value)}
            severity={severity}
            warnLowFraction={
              sensor.warnLow !== undefined ? rangeFraction(sensor, sensor.warnLow) : undefined
            }
            warnHighFraction={
              sensor.warnHigh !== undefined ? rangeFraction(sensor, sensor.warnHigh) : undefined
            }
            targetFraction={
              sensor.target !== undefined ? rangeFraction(sensor, sensor.target) : undefined
            }
          />
          <div className="mt-1 flex justify-between">
            <span className="label-xs tnum">{sensor.min}</span>
            <span className="label-xs tnum">{sensor.max}</span>
          </div>
        </div>

        <div className="mt-3 border-2 border-line bg-shell-950/60 p-2">
          <Sparkline points={points} color={SEVERITY_COLOR[severity]} width={272} height={54} />
        </div>
      </DeckSection>

      <DeckSection title="Alarm Limits">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
          {[
            ['Crit low', sensor.critLow],
            ['Warn low', sensor.warnLow],
            ['Warn high', sensor.warnHigh],
            ['Crit high', sensor.critHigh],
            ['Target', sensor.target],
          ]
            .filter(([, v]) => v !== undefined)
            .map(([label, v]) => (
              <div key={label as string} className="flex items-baseline justify-between border-b border-line/50 pb-1">
                <dt className="label-xs">{label as string}</dt>
                <dd className="text-[11px] text-slate-200 tnum">
                  {formatValue(v as number, sensor.decimals)}
                </dd>
              </div>
            ))}
        </dl>
      </DeckSection>
    </>
  );
}

function NodeDetail({ nodeId }: { nodeId: string }) {
  const facilityId = useConsole((s) => s.facilityId);
  const select = useConsole((s) => s.select);
  const equipment = useConsole((s) => s.equipment);

  let node;
  try {
    node = getNode(nodeId);
  } catch {
    return null;
  }

  const sensors = sensorsForNode(facilityId, nodeId);
  const nodeEquipment = equipment.filter((e) => e.nodeId === nodeId);
  const severity = nodeSeverity(facilityId, nodeId);

  return (
    <>
      <DeckSection title="Process Unit">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[13px] font-bold uppercase tracking-[0.1em] text-white">
              {node.label}
            </div>
            <div className="label-xs mt-1 normal-case tracking-normal">{node.sub}</div>
          </div>
          <StatusChip severity={severity} />
        </div>
      </DeckSection>

      {sensors.length > 0 && (
        <DeckSection title={`Instruments (${sensors.length})`}>
          <div className="flex flex-col gap-px">
            {sensors.map((sensor) => {
              const value = getValue(sensor.id);
              const sev = getChannel(sensor.id)?.severity ?? 'offline';
              return (
                <button
                  key={sensor.id}
                  type="button"
                  onClick={() => select({ kind: 'sensor', id: sensor.id })}
                  className="flex items-center gap-2 border border-transparent px-1.5 py-1.5 text-left transition-colors hover:border-line hover:bg-shell-850"
                >
                  <SeverityDot severity={sev} size={7} />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-slate-300">
                    {sensor.label}
                  </span>
                  <span
                    className="text-[11px] font-semibold tnum"
                    style={{ color: SEVERITY_COLOR[sev] }}
                  >
                    {formatValue(value, sensor.decimals)}
                  </span>
                  <span className="w-12 shrink-0 text-right text-[9px] text-faint">
                    {sensor.unit}
                  </span>
                </button>
              );
            })}
          </div>
        </DeckSection>
      )}

      {nodeEquipment.length > 0 && (
        <DeckSection title={`Equipment Control (${nodeEquipment.length})`}>
          <div className="flex flex-col gap-2">
            {nodeEquipment.map((item) => (
              <EquipmentControl key={item.id} item={item} />
            ))}
          </div>
        </DeckSection>
      )}
    </>
  );
}

function AlertDetail({ alertId }: { alertId: string }) {
  const alert = useConsole((s) => s.alerts.find((a) => a.id === alertId));
  const ackAlert = useConsole((s) => s.ackAlert);
  const resolveAlert = useConsole((s) => s.resolveAlert);
  const select = useConsole((s) => s.select);
  const pushEvent = useConsole((s) => s.pushEvent);
  const facilityId = useConsole((s) => s.facilityId);

  if (!alert) {
    return (
      <DeckSection title="Incident">
        <p className="label-xs normal-case tracking-normal">Alert no longer on the board.</p>
      </DeckSection>
    );
  }

  const sensor = alert.sensorId ? getSensor(alert.sensorId) : undefined;

  return (
    <>
      <DeckSection title="Incident">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[13px] font-bold uppercase tracking-[0.1em] text-white">
              {alert.code}
            </div>
            <div className="label-xs mt-1 tnum">{alert.sensorId ?? alert.equipmentId}</div>
          </div>
          <StatusChip severity={alert.severity} label={alert.state} />
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-slate-300">{alert.message}</p>
        <div className="label-xs mt-3 normal-case tracking-normal">
          Raised {relativeTime(alert.raisedAt)}
        </div>
      </DeckSection>

      <DeckSection title="Response">
        <div className="flex flex-wrap gap-1.5">
          <HardButton
            tone="warning"
            disabled={alert.state !== 'ACTIVE'}
            onClick={() => {
              ackAlert(alert.id);
              void sendAlertAction(alert.id, 'ack');
              pushEvent({
                id: `ack-${alert.id}-${Date.now()}`,
                facilityId,
                level: 'AUTO',
                source: 'OPS',
                message: `Acknowledged ${alert.code}`,
                at: Date.now(),
              });
            }}
          >
            Acknowledge
          </HardButton>
          <HardButton
            tone="flow"
            disabled={alert.state === 'RESOLVED'}
            onClick={() => {
              resolveAlert(alert.id);
              void sendAlertAction(alert.id, 'resolve');
              pushEvent({
                id: `res-${alert.id}-${Date.now()}`,
                facilityId,
                level: 'INFO',
                source: 'OPS',
                message: `Resolved ${alert.code}`,
                at: Date.now(),
              });
            }}
          >
            Resolve
          </HardButton>
          {sensor && (
            <HardButton onClick={() => select({ kind: 'sensor', id: sensor.id })}>
              Inspect sensor
            </HardButton>
          )}
        </div>
      </DeckSection>
    </>
  );
}

function IdleDeck() {
  const facilityId = useConsole((s) => s.facilityId);
  const alerts = useConsole((s) => s.alerts);
  const events = useConsole((s) => s.events);
  const select = useConsole((s) => s.select);
  const equipment = useConsole((s) => s.equipment);
  const plants = useAuth((s) => s.plants);
  const facility = getFacility(facilityId, plants);

  const active = alerts.filter((a) => a.state === 'ACTIVE').slice(0, 6);
  const running = equipment.filter((e) => e.running).length;

  return (
    <>
      <DeckSection title="Active Incident">
        {active.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex size-11 items-center justify-center border-2 border-nominal/40 bg-nominal/5">
              <svg viewBox="0 0 24 24" className="size-5 text-nominal" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-nominal">
                All stages nominal
              </div>
              <p className="label-xs mt-1.5 max-w-[220px] normal-case leading-relaxed tracking-normal">
                Select any unit on the twin to inspect its instruments and take control.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {active.map((alert) => (
              <button
                key={alert.id}
                type="button"
                onClick={() => select({ kind: 'alert', id: alert.id })}
                className={clsx(
                  'border-2 p-2 text-left transition-colors',
                  alert.severity === 'critical'
                    ? 'border-critical/50 bg-critical/5 hover:bg-critical/10'
                    : 'border-warning/50 bg-warning/5 hover:bg-warning/10',
                )}
              >
                <div className="flex items-center gap-2">
                  <SeverityDot severity={alert.severity} size={7} pulse />
                  <span className="label-xs tnum">{alert.sensorId}</span>
                  <span className="label-xs ml-auto normal-case tracking-normal">
                    {relativeTime(alert.raisedAt)}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-slate-300">{alert.message}</p>
              </button>
            ))}
          </div>
        )}
      </DeckSection>

      <DeckSection title="Plant Posture">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Equipment running', value: `${running}/${equipment.length}` },
            { label: 'Active alerts', value: String(active.length) },
            { label: 'Facility', value: facility.code },
            { label: 'Control mode', value: 'SUPERVISORY' },
          ].map((item) => (
            <div key={item.label} className="border-2 border-line px-2 py-1.5">
              <div className="label-xs">{item.label}</div>
              <div className="mt-1 text-[13px] font-semibold text-slate-100 tnum">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </DeckSection>

      <DeckSection title="Recent Actions">
        {events.length === 0 ? (
          <p className="label-xs normal-case tracking-normal">No operator actions this shift.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {events.slice(0, 6).map((e) => (
              <div key={e.id} className="flex gap-2 border-l-2 border-line pl-2">
                <span className="label-xs shrink-0 tnum">{e.source}</span>
                <span className="min-w-0 flex-1 truncate text-[10px] text-slate-400">
                  {e.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </DeckSection>
    </>
  );
}

export function CommandDeck() {
  const selection = useConsole((s) => s.selection);
  const select = useConsole((s) => s.select);
  const open = useConsole((s) => s.deckOpen);
  const toggle = useConsole((s) => s.toggleDeck);
  useConsole((s) => s.tick);

  if (!open) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label="Open command deck"
        className="chrome z-20 flex w-8 shrink-0 items-center justify-center border-l-2 border-line bg-shell-900 text-faint transition-colors hover:text-flow"
      >
        <span className="rotate-180 text-[10px] font-semibold uppercase tracking-[0.2em] [writing-mode:vertical-rl]">
          Command Deck
        </span>
      </button>
    );
  }

  return (
    <aside className="chrome z-20 flex w-[320px] shrink-0 flex-col border-l-2 border-line bg-shell-900">
      <div className="flex items-center gap-2 border-b-2 border-line bg-shell-850/70 px-3 py-2">
        <span className="size-1.5 bg-flow" />
        <span className="label-xs text-slate-300">Command Deck</span>
        <div className="ml-auto flex items-center gap-1">
          {selection && (
            <button
              type="button"
              onClick={() => select(null)}
              className="focus-hard border border-line px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-faint transition-colors hover:border-flow hover:text-flow"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={toggle}
            aria-label="Collapse command deck"
            className="focus-hard border border-line px-1.5 py-0.5 text-[9px] text-faint transition-colors hover:border-flow hover:text-flow"
          >
            {'\u25B6'}
          </button>
        </div>
      </div>

      <div className="deck-scroll flex-1 overflow-y-auto">
        {selection?.kind === 'sensor' ? (
          <SensorDetail sensorId={selection.id} />
        ) : selection?.kind === 'node' ? (
          <NodeDetail nodeId={selection.id} />
        ) : selection?.kind === 'alert' ? (
          <AlertDetail alertId={selection.id} />
        ) : (
          <IdleDeck />
        )}
      </div>
    </aside>
  );
}
