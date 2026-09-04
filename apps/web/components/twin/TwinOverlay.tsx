'use client';

import { useCallback } from 'react';
import clsx from 'clsx';
import {
  PLANT_NODES,
  SEVERITY_COLOR,
  sensorsForNode,
  type PlantNode,
} from '@aquasense/shared';
import { getValue } from '@/lib/channels';
import { nodeFlaggedCount, nodeSeverity } from '@/lib/health';
import { formatValue } from '@/lib/format';
import { useConsole } from '@/stores/useConsole';
import { attachAnchorElement } from './registry';

function NodeCallout({ node }: { node: PlantNode }) {
  const facilityId = useConsole((s) => s.facilityId);
  const selection = useConsole((s) => s.selection);
  const select = useConsole((s) => s.select);

  const ref = useCallback(
    (el: HTMLDivElement | null) => attachAnchorElement(node.id, el),
    [node.id],
  );

  const severity = nodeSeverity(facilityId, node.id);
  const flagged = nodeFlaggedCount(facilityId, node.id);
  const selected = selection?.kind === 'node' && selection.id === node.id;

  const pinned = sensorsForNode(facilityId, node.id)
    .filter((s) => s.pinned)
    .slice(0, 3);

  const accent = SEVERITY_COLOR[severity];

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute left-0 top-0 will-change-transform"
      style={{ zIndex: selected ? 30 : severity === 'critical' ? 20 : 10 }}
    >
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => select({ kind: 'node', id: node.id })}
          className={clsx(
            'pointer-events-auto min-w-[132px] border-2 bg-shell-900/92 text-left backdrop-blur transition-all',
            'shadow-brut-sm hover:-translate-y-0.5',
            selected ? 'border-flow' : 'border-line hover:border-line-bright',
            severity === 'critical' && !selected && 'border-critical/70',
            severity === 'warning' && !selected && 'border-warning/60',
          )}
        >
          <div
            className={clsx(
              'flex items-center gap-1.5 border-b px-1.5 py-1',
              severity === 'critical' && 'hazard-stripe',
              severity === 'warning' && 'hazard-stripe-amber',
            )}
            style={{ borderColor: 'var(--color-line)' }}
          >
            <span
              className={clsx('size-1.5 shrink-0', severity === 'critical' && 'animate-alarm')}
              style={{ backgroundColor: accent }}
            />
            <span className="truncate text-[9px] font-bold uppercase leading-none tracking-[0.1em] text-slate-100">
              {node.label}
            </span>
            {flagged > 0 && (
              <span
                className="ml-auto shrink-0 px-1 text-[9px] font-bold leading-none tnum"
                style={{ color: accent }}
              >
                {flagged}
              </span>
            )}
          </div>

          {pinned.length > 0 && (
            <div className="flex flex-col gap-0.5 px-1.5 py-1">
              {pinned.map((sensor) => {
                const value = getValue(sensor.id);
                return (
                  <div key={sensor.id} className="flex items-baseline gap-1.5">
                    <span className="min-w-0 flex-1 truncate text-[8px] uppercase tracking-[0.06em] text-faint">
                      {sensor.parameter}
                    </span>
                    <span className="text-[11px] font-semibold leading-none text-slate-100 tnum">
                      {formatValue(value, sensor.decimals)}
                    </span>
                    <span className="w-9 shrink-0 text-[7px] leading-none text-faint">
                      {sensor.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </button>

        {/* Drafting leader line down to the equipment. */}
        <span
          className="w-px"
          style={{ height: 22, backgroundColor: selected ? 'var(--color-flow)' : accent, opacity: 0.7 }}
        />
        <span
          className="size-1.5 rotate-45"
          style={{ backgroundColor: selected ? 'var(--color-flow)' : accent }}
        />
      </div>
    </div>
  );
}

export function TwinOverlay() {
  // One throttled subscription re-renders every callout together.
  useConsole((s) => s.tick);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {PLANT_NODES.map((node) => (
        <NodeCallout key={node.id} node={node} />
      ))}
    </div>
  );
}
