'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { getFacility } from '@aquasense/shared';
import { useAuth } from '@/stores/useAuth';
import { useConsole } from '@/stores/useConsole';

function kindLabel(kind: string) {
  if (kind === 'wrrf') return 'Full treatment train';
  if (kind === 'pretreatment') return 'Industrial pre-treatment';
  return 'Receiving water body';
}

export function PlantSwitcher({ compact }: { compact?: boolean }) {
  const facilityId = useConsole((s) => s.facilityId);
  const setFacility = useConsole((s) => s.setFacility);
  const plants = useAuth((s) => s.plants);
  const user = useAuth((s) => s.user);
  const [open, setOpen] = useState(false);
  const facility = getFacility(facilityId, plants);
  const canSwitch = user?.role === 'ADMIN' || plants.length > 1;

  if (!canSwitch) {
    return (
      <div className="border-2 border-line bg-shell-850 px-3 py-1.5">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-100">
          {facility.shortName}
        </span>
        <span className="label-xs">{facility.code}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="focus-hard flex items-center gap-2.5 border-2 border-line bg-shell-850 px-3 py-1.5 text-left transition-colors hover:border-line-bright"
        aria-label="Select plant"
        aria-expanded={open}
      >
        <span className="flex size-6 items-center justify-center border border-flow/40 bg-flow/10 text-[9px] font-bold tracking-tight text-flow tnum">
          {facility.code.split('-')[0]}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-100">
            {facility.shortName}
          </span>
          <span className="label-xs block">{compact ? 'Plant' : facility.code}</span>
        </span>
        <span className="ml-1 text-[8px] text-faint">{open ? '\u25B2' : '\u25BC'}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-72 border-2 border-line bg-shell-900 shadow-brut">
            {plants.length === 0 ? (
              <p className="px-3 py-2.5 text-[11px] text-slate-400">No plants in catalogue</p>
            ) : (
              plants.map((plant) => {
                const active = plant.id === facilityId;
                return (
                  <button
                    key={plant.id}
                    type="button"
                    onClick={() => {
                      setFacility(plant.id);
                      setOpen(false);
                    }}
                    className={clsx(
                      'flex w-full items-center gap-3 border-b border-line/60 px-3 py-2.5 text-left transition-colors last:border-b-0',
                      active ? 'bg-flow/10' : 'hover:bg-shell-800',
                    )}
                  >
                    <span className={clsx('size-1.5', active ? 'bg-flow' : 'bg-offline')} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-100">
                        {plant.shortName}
                      </span>
                      <span className="label-xs block normal-case tracking-normal">
                        {kindLabel(plant.kind)}
                      </span>
                    </span>
                    <span className="label-xs tnum">{plant.code}</span>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
