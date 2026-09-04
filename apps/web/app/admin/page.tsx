'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SEVERITY_COLOR, type Severity } from '@aquasense/shared';
import { api } from '@/lib/api';
import { HardButton } from '@/components/ui/primitives';
import { WorkspaceHeader } from '@/components/views/WorkspaceHeader';
import type { FleetSite } from '@/components/admin/FleetMap';

const FleetMap = dynamic(
  () => import('@/components/admin/FleetMap').then((m) => m.FleetMap),
  { ssr: false },
);

export default function FleetPage() {
  const router = useRouter();
  const [sites, setSites] = useState<FleetSite[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api<FleetSite[]>('/admin/fleet')
      .then(setSites)
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'));

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 4000);
    return () => clearInterval(t);
  }, []);

  const flagged = sites.filter((s) => s.severity === 'warning' || s.severity === 'critical').length;

  return (
    <div className="p-4">
      <WorkspaceHeader
        title="Catchment fleet"
        subtitle={`${sites.length} plants · ${flagged} sites flagged`}
      />
      {error && <p className="mt-3 text-[12px] text-critical">{error}</p>}

      <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_360px]">
        <div className="slab overflow-hidden shadow-brut">
          <FleetMap sites={sites} onSelect={(id) => router.push(`/admin/plants/${id}`)} />
        </div>

        <div className="slab shadow-brut">
          <div className="border-b-2 border-line px-3 py-2 label-xs">Sites</div>
          {sites.map((site) => (
            <div
              key={site.id}
              className="flex w-full items-center gap-3 border-b border-line/50 px-3 py-2.5 text-left hover:bg-shell-850"
            >
              <span
                className="size-2 shrink-0"
                style={{ backgroundColor: SEVERITY_COLOR[site.severity as Severity] }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold uppercase tracking-[0.08em]">
                  {site.shortName}
                </div>
                <div className="label-xs mt-0.5 normal-case tracking-normal">
                  {site.code} · {site.kind} · {site.instruments} pts
                </div>
              </div>
              <HardButton
                tone={site.critical ? 'critical' : site.warning ? 'warning' : 'default'}
                onClick={() => router.push(`/admin/plants/${site.id}`)}
              >
                {site.critical + site.warning || 'Open'}
              </HardButton>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
