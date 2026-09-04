'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { computeWqi, getFacility } from '@aquasense/shared';
import Link from 'next/link';
import { getValue } from '@/lib/channels';
import { facilityCounts } from '@/lib/health';
import { formatClock, formatDate } from '@/lib/format';
import { useConsole } from '@/stores/useConsole';
import { useAuth } from '@/stores/useAuth';
import { HardButton } from '@/components/ui/primitives';
import { ThemeToggle, ViewModeSwitch } from '@/components/providers/ThemeProvider';
import { PlantSwitcher } from '@/components/shell/PlantSwitcher';

function StreamBadge() {
  const connection = useConsole((s) => s.connection);
  const streamMode = useConsole((s) => s.streamMode);

  const config =
    connection === 'socket'
      ? streamMode === 'LIVE'
        ? { label: 'LIVE', color: 'text-nominal', dot: 'bg-nominal' }
        : { label: 'SIM CORE', color: 'text-flow', dot: 'bg-flow' }
      : connection === 'local'
        ? { label: 'LOCAL SIM', color: 'text-warning', dot: 'bg-warning' }
        : { label: 'LINKING', color: 'text-offline', dot: 'bg-offline' };

  return (
    <div
      className={clsx(
        'flex items-center gap-2 border-2 border-line px-2.5 py-1',
        config.color,
      )}
    >
      <span className={clsx('size-1.5 animate-alarm', config.dot)} />
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
        {config.label}
      </span>
    </div>
  );
}

function PlantClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="text-right">
      <div className="text-xl font-semibold leading-none text-flow tnum">
        {now ? formatClock(now) : '--:--:--'}
      </div>
      <div className="label-xs mt-1 tnum">{now ? formatDate(now) : ''}</div>
    </div>
  );
}

export function StatusBar() {
  const facilityId = useConsole((s) => s.facilityId);
  const setFacility = useConsole((s) => s.setFacility);
  const plants = useAuth((s) => s.plants);
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  useConsole((s) => s.tick);

  useEffect(() => {
    if (!plants.length) return;
    if (!plants.some((p) => p.id === facilityId)) {
      setFacility(plants[0].id);
    }
  }, [plants, facilityId, setFacility]);

  const counts = facilityCounts(facilityId);
  const facility = getFacility(facilityId, plants);

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

  return (
    <header className="chrome relative z-30 flex h-16 shrink-0 items-center gap-4 border-b-2 border-line bg-shell-900/95 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="relative flex size-9 items-center justify-center border-2 border-flow/50 bg-flow/10">
          <span className="absolute inset-0 scanlines" />
          <svg viewBox="0 0 24 24" className="size-5 text-flow" aria-hidden>
            <path
              d="M12 2c3.6 4.6 6 8 6 11a6 6 0 1 1-12 0c0-3 2.4-6.4 6-11Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path d="M8 14.5c1.4 1.2 2.6 1.2 4 0s2.6-1.2 4 0" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
        <div className="hidden sm:block">
          <div className="text-sm font-bold uppercase leading-none tracking-[0.22em] text-white">
            Aquasense
          </div>
          <div className="label-xs mt-1">Digital Twin v0.1</div>
        </div>
      </div>

      <div className="hidden h-8 w-px bg-line lg:block" />

      <div className="hidden min-w-0 lg:block">
        <h1 className="truncate text-[13px] font-bold uppercase tracking-[0.16em] text-slate-100">
          Operational Digital Twin
        </h1>
        <p className="label-xs mt-0.5 truncate normal-case tracking-normal">
          {facility.name}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {wqi !== null && (
          <div className="hidden items-baseline gap-2 border-2 border-line px-3 py-1 xl:flex">
            <span className="label-xs">WQI</span>
            <span className="text-lg font-semibold leading-none text-flow tnum">
              {wqi.toFixed(1)}
            </span>
          </div>
        )}

        <div
          className={clsx(
            'flex items-center gap-2 border-2 px-2.5 py-1',
            counts.critical > 0
              ? 'border-critical/60 bg-critical/10 text-critical'
              : counts.warning > 0
                ? 'border-warning/60 bg-warning/10 text-warning'
                : 'border-line text-nominal',
          )}
        >
          <span className="text-sm font-semibold leading-none tnum">
            {counts.critical + counts.warning}
          </span>
          <span className="text-[9px] font-semibold uppercase leading-none tracking-[0.14em]">
            Active
            <br />
            Alerts
          </span>
        </div>

        <StreamBadge />
        <ViewModeSwitch />
        <PlantSwitcher />
        {user?.role === 'ADMIN' && (
          <Link href="/admin" className="label-xs text-flow hidden lg:inline">
            Admin
          </Link>
        )}
        <ThemeToggle compact />
        <HardButton onClick={() => logout()}>Out</HardButton>
        <div className="hidden h-8 w-px bg-line md:block" />
        <div className="hidden md:block">
          <PlantClock />
        </div>
      </div>
    </header>
  );
}
