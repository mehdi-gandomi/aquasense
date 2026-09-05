'use client';

import { useEffect } from 'react';
import { ADMIN_LOOKS, UI_STYLES, useTheme, type AdminLook, type UiStyle } from '@/stores/useTheme';

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
    <div role="group" aria-label="Plant view" className="flex border-2 border-line">
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

export function StyleSwitch({ compact }: { compact?: boolean }) {
  const style = useTheme((s) => s.style);
  const setStyle = useTheme((s) => s.setStyle);

  if (compact) {
    return (
      <label className="focus-hard flex items-center border-2 border-line">
        <span className="sr-only">Dashboard style</span>
        <select
          value={style}
          onChange={(e) => setStyle(e.target.value as UiStyle)}
          aria-label="Dashboard style"
          className="bg-transparent px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300 outline-none hover:text-white"
        >
          {UI_STYLES.map((item) => (
            <option key={item.id} value={item.id} className="bg-shell-900 text-slate-100">
              {item.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div role="group" aria-label="Dashboard style" className="flex border-2 border-line">
      {UI_STYLES.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setStyle(item.id)}
          aria-pressed={style === item.id}
          className={
            style === item.id
              ? 'bg-flow px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-shell-950'
              : 'px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300 hover:text-white'
          }
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/** Soft (colorful SaaS) vs Brutal (classic SCADA) admin chrome. */
export function AdminLookSwitch({ compact }: { compact?: boolean }) {
  const adminLook = useTheme((s) => s.adminLook);
  const setAdminLook = useTheme((s) => s.setAdminLook);

  if (compact) {
    return (
      <label className="focus-hard flex items-center border-2 border-line" title="Admin look">
        <span className="sr-only">Admin look</span>
        <select
          value={adminLook}
          onChange={(e) => setAdminLook(e.target.value as AdminLook)}
          aria-label="Admin look"
          className="bg-transparent px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300 outline-none hover:text-white"
        >
          {ADMIN_LOOKS.map((item) => (
            <option key={item.id} value={item.id} className="bg-shell-900 text-slate-100">
              Admin · {item.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div role="group" aria-label="Admin look" className="flex border-2 border-line">
      {ADMIN_LOOKS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setAdminLook(item.id)}
          aria-pressed={adminLook === item.id}
          className={
            adminLook === item.id
              ? 'bg-flow px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-shell-950'
              : 'px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300 hover:text-white'
          }
        >
          {item.label}
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
