'use client';

import clsx from 'clsx';
import {
  PLANT_HEIGHT,
  PLANT_NODES,
  PLANT_PIPES,
  PLANT_WIDTH,
  SEVERITY_COLOR,
  pipePoints,
  sensorsForFacility,
  type Pathway,
} from '@aquasense/shared';
import { getValue } from '@/lib/channels';
import { formatValue } from '@/lib/format';
import { nodeSeverity } from '@/lib/health';
import { useConsole } from '@/stores/useConsole';

const PIPE_COLOR: Record<Pathway, string> = {
  liquid: '#14afc4',
  recycle: '#4fd8ea',
  sludge: '#8a6f4b',
  gas: '#9b7cd4',
};

function pathD(points: Array<[number, number]>): string {
  return points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
}

export function SchematicPlantView() {
  const facilityId = useConsole((s) => s.facilityId);
  const select = useConsole((s) => s.select);
  const selection = useConsole((s) => s.selection);
  useConsole((s) => s.tick);

  const sensors = sensorsForFacility(facilityId);

  return (
    <div className="absolute inset-0 overflow-auto bg-shell-950 p-4 pt-24">
      <div className="pointer-events-none absolute inset-0 grid-paper opacity-30" />

      <div className="relative mx-auto max-w-[1400px]">
        <svg
          viewBox={`0 0 ${PLANT_WIDTH} ${PLANT_HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label="Plant process schematic"
        >
          {PLANT_PIPES.map((pipe) => (
            <path
              key={pipe.id}
              d={pathD(pipePoints(pipe))}
              fill="none"
              stroke={PIPE_COLOR[pipe.pathway]}
              strokeWidth={pipe.pathway === 'liquid' ? 10 : 7}
              strokeLinecap="square"
              opacity={0.55}
            />
          ))}

          {PLANT_NODES.map((node) => {
            const sev = nodeSeverity(facilityId, node.id);
            const selected = selection?.kind === 'node' && selection.id === node.id;
            const x = node.x - node.w / 2;
            const y = node.y - node.h / 2;
            const owned = sensors.filter((s) => s.nodeId === node.id);
            const pinned = owned.find((s) => s.pinned) ?? owned[0];
            const value = pinned ? getValue(pinned.id) : null;

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onClick={() => select({ kind: 'node', id: node.id })}
              >
                <rect
                  x={x}
                  y={y}
                  width={node.w}
                  height={node.h}
                  fill={selected ? 'rgba(20,175,196,0.16)' : 'rgba(7,21,34,0.72)'}
                  stroke={selected ? '#14afc4' : SEVERITY_COLOR[sev]}
                  strokeWidth={selected ? 6 : 4}
                />
                <circle
                  cx={x + 22}
                  cy={y + 22}
                  r={10}
                  fill={SEVERITY_COLOR[sev]}
                />
                <text
                  x={node.x}
                  y={node.y - 10}
                  textAnchor="middle"
                  fill="#eef4f6"
                  fontSize={22}
                  fontWeight={700}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
                >
                  {node.label}
                </text>
                <text
                  x={node.x}
                  y={node.y + 18}
                  textAnchor="middle"
                  fill="#7f9bb3"
                  fontSize={16}
                >
                  {node.sub}
                </text>
                {pinned && value != null && (
                  <text
                    x={node.x}
                    y={node.y + 46}
                    textAnchor="middle"
                    fill={SEVERITY_COLOR[sev]}
                    fontSize={20}
                    fontFamily="ui-monospace, monospace"
                    fontWeight={600}
                  >
                    {formatValue(value, pinned.decimals)} {pinned.unit}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <div className="mt-3 flex flex-wrap gap-3 px-1">
          {(
            [
              ['liquid', 'Liquid train'],
              ['recycle', 'RAS recycle'],
              ['sludge', 'Sludge'],
              ['gas', 'Biogas'],
            ] as const
          ).map(([key, label]) => (
            <span key={key} className="flex items-center gap-2 label-xs">
              <span className="h-0.5 w-5" style={{ backgroundColor: PIPE_COLOR[key] }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ReservoirSchematic() {
  const facilityId = useConsole((s) => s.facilityId);
  const select = useConsole((s) => s.select);
  useConsole((s) => s.tick);
  const sensors = sensorsForFacility(facilityId);
  const sev = nodeSeverity(facilityId, 'reservoir');

  return (
    <div className="absolute inset-0 overflow-auto bg-shell-950 p-4 pt-24">
      <div className="pointer-events-none absolute inset-0 grid-paper opacity-25" />
      <button
        type="button"
        onClick={() => select({ kind: 'node', id: 'reservoir' })}
        className={clsx(
          'relative mx-auto mt-8 flex min-h-[280px] w-full max-w-4xl flex-col justify-end border-2 p-5 text-left shadow-brut',
          'border-line bg-flow/10',
        )}
      >
        <span
          className="absolute left-4 top-4 size-2.5"
          style={{ backgroundColor: SEVERITY_COLOR[sev] }}
        />
        <div className="text-[13px] font-bold uppercase tracking-[0.16em] text-white">
          Receiving water body
        </div>
        <p className="label-xs mt-1.5 normal-case tracking-normal">
          Surface, photic zone and hypolimnion instruments
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sensors.map((sensor) => (
            <div key={sensor.id} className="flex items-baseline justify-between gap-2 border-2 border-line bg-shell-900/70 px-2 py-1.5">
              <span className="truncate text-[10px] uppercase tracking-[0.08em]">{sensor.label}</span>
              <span className="text-[13px] font-semibold tnum" style={{ color: SEVERITY_COLOR[nodeSeverity(facilityId, sensor.nodeId)] }}>
                {formatValue(getValue(sensor.id), sensor.decimals)} {sensor.unit}
              </span>
            </div>
          ))}
        </div>
      </button>
    </div>
  );
}
