'use client';

import { useEffect } from 'react';
import { useTheme } from '@/stores/useTheme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useTheme((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return <>{children}</>;
}

export function ViewModeSwitch() {
  const viewMode = useTheme((s) => s.viewMode);
  const setViewMode = useTheme((s) => s.setViewMode);

  return (
    <div
      role="group"
      aria-label="Plant view"
      className="flex border-2 border-line"
    >
      {(['2d', '3d'] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => setViewMode(mode)}
          aria-pressed={viewMode === mode}
          className={
            viewMode === mode
              ? 'bg-flow px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-shell-950'
              : 'px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300 hover:text-white'
          }
        >
          {mode === '2d' ? '2D' : '3D'}
        </button>
      ))}
    </div>
  );
}

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const theme = useTheme((s) => s.theme);
  const toggleTheme = useTheme((s) => s.toggleTheme);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="focus-hard border-2 border-line px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300 hover:border-line-bright hover:text-white"
      title={theme === 'dark' ? 'Switch to light workspace' : 'Switch to dark workspace'}
    >
      {compact ? (theme === 'dark' ? 'Day' : 'Night') : theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  );
}
