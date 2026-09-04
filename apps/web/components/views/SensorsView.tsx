'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { sensorsForFacility } from '@aquasense/shared';
import { getSeverity } from '@/lib/channels';
import { useConsole } from '@/stores/useConsole';
import { SensorCard } from '@/components/ui/SensorCard';
import { HardButton } from '@/components/ui/primitives';
import { WorkspaceHeader } from '@/components/views/WorkspaceHeader';

type Filter = 'all' | 'flagged' | 'pinned';

export function SensorsView() {
  const facilityId = useConsole((s) => s.facilityId);
  useConsole((s) => s.tick);

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const all = useMemo(() => sensorsForFacility(facilityId), [facilityId]);

  const visible = all.filter((sensor) => {
    if (query && !`${sensor.label} ${sensor.id} ${sensor.nodeId}`.toLowerCase().includes(query.toLowerCase())) {
      return false;
    }
    if (filter === 'pinned') return Boolean(sensor.pinned);
    if (filter === 'flagged') {
      const sev = getSeverity(sensor.id);
      return sev === 'warning' || sev === 'critical';
    }
    return true;
  });

  const flaggedCount = all.filter((s) => {
    const sev = getSeverity(s.id);
    return sev === 'warning' || sev === 'critical';
  }).length;

  return (
    <div className="absolute inset-0 overflow-y-auto bg-shell-950">
      <div className="pointer-events-none absolute inset-0 grid-paper opacity-20" />

      <div className="relative p-4">
        <WorkspaceHeader
          title="Instrument Grid"
          subtitle={`${all.length} instruments online \u2014 ${flaggedCount} flagged`}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="FILTER BY TAG OR NAME"
            className="focus-hard w-52 border-2 border-line bg-shell-900 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.1em] text-slate-200 placeholder:text-faint"
          />
          {(['all', 'flagged', 'pinned'] as Filter[]).map((f) => (
            <HardButton key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f === 'flagged' ? `Flagged ${flaggedCount}` : f}
            </HardButton>
          ))}
        </WorkspaceHeader>

        {visible.length === 0 ? (
          <div className="slab mt-4 flex items-center justify-center py-16">
            <span className="label-xs normal-case tracking-normal">
              No instruments match this filter.
            </span>
          </div>
        ) : (
          <div
            className={clsx(
              'mt-4 grid gap-3',
              'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4',
            )}
          >
            {visible.map((sensor) => (
              <SensorCard key={sensor.id} sensor={sensor} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
