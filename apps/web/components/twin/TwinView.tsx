'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import clsx from 'clsx';
import { WATER_RAMP } from '@aquasense/shared';
import { clearAnchorElements } from './registry';
import { TwinOverlay } from './TwinOverlay';

const TwinCanvas = dynamic(() => import('./TwinCanvas').then((m) => m.TwinCanvas), {
  ssr: false,
  loading: () => <TwinBooting />,
});

function TwinBooting() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-1 w-40 overflow-hidden bg-shell-800">
          <span className="absolute inset-y-0 w-1/3 animate-sweep bg-flow" />
        </div>
        <span className="label-xs">Loading plant geometry</span>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="slab pointer-events-none absolute bottom-3 left-3 px-3 py-2 shadow-brut">
      <div className="label-xs mb-2">Treatment Progress</div>
      <div className="flex items-center gap-2">
        <span className="label-xs normal-case tracking-normal text-faint/80">Raw</span>
        <div className="flex h-2.5">
          {WATER_RAMP.map((c) => (
            <span key={c} className="w-5" style={{ backgroundColor: c }} />
          ))}
        </div>
        <span className="label-xs normal-case tracking-normal text-faint/80">Polished</span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line pt-2">
        {[
          ['Liquid', '#4fd8ea'],
          ['Recycle', '#2f97b5'],
          ['Sludge', '#9b7b4f'],
          ['Biogas', '#b79ce8'],
        ].map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4" style={{ backgroundColor: color }} />
            <span className="text-[9px] uppercase tracking-[0.1em] text-faint">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function TwinView({ children }: { children?: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReady(true);
    return () => clearAnchorElements();
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-shell-950">
      <div className="pointer-events-none absolute inset-0 grid-paper opacity-30" />

      {ready && (
        <Suspense fallback={<TwinBooting />}>
          <TwinCanvas />
        </Suspense>
      )}

      <TwinOverlay />

      {/* Vignette keeps focus on the centre of the works. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, transparent 40%, rgba(4,16,27,0.55) 100%)',
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-shell-950/70 to-transparent" />

      <Legend />

      <div
        className={clsx(
          'pointer-events-none absolute bottom-3 right-3 hidden items-center gap-2 md:flex',
        )}
      >
        <span className="slab px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-faint shadow-brut">
          Drag to pan {'\u00B7'} Scroll to zoom {'\u00B7'} Click a unit to inspect
        </span>
      </div>

      {children}
    </div>
  );
}
