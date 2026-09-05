'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { AuthGate } from '@/components/providers/AuthGate';
import { useAuth } from '@/stores/useAuth';
import {
  AdminLookSwitch,
  StyleSwitch,
  ThemeToggle,
} from '@/components/providers/ThemeProvider';
import { PlantSwitcher } from '@/components/shell/PlantSwitcher';
import { useConsole } from '@/stores/useConsole';
import { useTheme } from '@/stores/useTheme';
import { AdminButton } from '@/components/admin/AdminUi';
import { HardButton } from '@/components/ui/primitives';

const NAV = [
  { href: '/admin', label: 'Fleet', hint: 'Map & sites', icon: 'fleet' },
  { href: '/admin/clients', label: 'Clients', hint: 'Companies', icon: 'clients' },
  { href: '/admin/plants', label: 'Plants', hint: 'Sites & pins', icon: 'plants' },
  { href: '/admin/users', label: 'Users', hint: 'Access', icon: 'users' },
] as const;

function NavIcon({ name }: { name: string }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'fleet':
      return (
        <svg viewBox="0 0 24 24" className="size-4" {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    case 'clients':
      return (
        <svg viewBox="0 0 24 24" className="size-4" {...common}>
          <path d="M4 20v-2a4 4 0 0 1 4-4h2" />
          <circle cx="9" cy="8" r="3" />
          <path d="M16 20v-1.5a3.5 3.5 0 0 1 3.5-3.5H20" />
          <circle cx="18" cy="9" r="2.5" />
        </svg>
      );
    case 'plants':
      return (
        <svg viewBox="0 0 24 24" className="size-4" {...common}>
          <path d="M4 19h16" />
          <path d="M7 19V9l5-4 5 4v10" />
          <path d="M10 19v-5h4v5" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className="size-4" {...common}>
          <circle cx="12" cy="8" r="3" />
          <path d="M5 19c1.5-3 4-4.5 7-4.5S17.5 16 19 19" />
        </svg>
      );
  }
}

function SoftShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const facilityId = useConsole((s) => s.facilityId);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="admin-app flex h-dvh overflow-hidden bg-[#eef4f8] text-slate-800" data-admin-look="soft">
      <aside
        className={clsx(
          'relative z-20 flex shrink-0 flex-col border-r border-slate-200/80 bg-white transition-[width] duration-200',
          collapsed ? 'w-[76px]' : 'w-[248px]',
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-100 px-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-sm">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 2c3.6 4.6 6 8 6 11a6 6 0 1 1-12 0c0-3 2.4-6.4 6-11Z" />
            </svg>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-[13px] font-bold tracking-tight text-slate-800">Aquasense</div>
              <div className="text-[11px] text-slate-400">Admin console</div>
            </div>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active =
              item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                  active
                    ? 'bg-gradient-to-r from-cyan-500/15 to-teal-500/10 text-cyan-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
                )}
              >
                <span
                  className={clsx(
                    'flex size-8 shrink-0 items-center justify-center rounded-lg',
                    active ? 'bg-cyan-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500',
                  )}
                >
                  <NavIcon name={item.icon} />
                </span>
                {!collapsed && (
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold leading-none">{item.label}</span>
                    <span className="mt-1 block text-[11px] text-slate-400">{item.hint}</span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="w-full rounded-xl px-3 py-2 text-left text-[12px] font-semibold text-slate-500 hover:bg-slate-50"
          >
            {collapsed ? '»' : 'Collapse'}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-cyan-600">Operations</div>
            <div className="truncate text-[13px] text-slate-500">Catchment administration</div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="hidden lg:block [&_button]:rounded-xl [&_label]:rounded-xl [&_select]:rounded-xl">
              <PlantSwitcher compact />
            </div>
            <AdminLookSwitch compact />
            <StyleSwitch compact />
            <ThemeToggle compact />
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-[12px] font-medium text-slate-600 sm:inline">
              {user?.email}
            </span>
            <Link href={`/?facility=${encodeURIComponent(facilityId)}`}>
              <AdminButton tone="primary">Open twin</AdminButton>
            </Link>
            <AdminButton onClick={() => logout()}>Sign out</AdminButton>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] p-5 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

function BrutalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const facilityId = useConsole((s) => s.facilityId);

  return (
    <div className="admin-app flex h-dvh flex-col bg-shell-950" data-admin-look="brutal">
      <header className="chrome flex h-14 items-center gap-4 border-b-2 border-line bg-shell-900 px-4">
        <Link href="/admin" className="text-[13px] font-bold uppercase tracking-[0.18em] text-white">
          Admin
        </Link>
        <nav className="flex gap-1">
          {NAV.map((item) => {
            const active =
              item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'border-2 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]',
                  active
                    ? 'border-flow bg-flow/10 text-flow'
                    : 'border-line text-slate-400 hover:text-white',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <PlantSwitcher compact />
          <AdminLookSwitch compact />
          <StyleSwitch compact />
          <span className="label-xs hidden sm:inline">{user?.email}</span>
          <ThemeToggle compact />
          <Link href={`/?facility=${encodeURIComponent(facilityId)}`} className="label-xs text-flow">
            Open twin
          </Link>
          <HardButton onClick={() => logout()}>Sign out</HardButton>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const plants = useAuth((s) => s.plants);
  const facilityId = useConsole((s) => s.facilityId);
  const setFacility = useConsole((s) => s.setFacility);
  const adminLook = useTheme((s) => s.adminLook);
  const hydrated = useTheme((s) => s.hydrated);

  useEffect(() => {
    if (!plants.length) return;
    if (!plants.some((p) => p.id === facilityId)) {
      setFacility(plants[0].id);
    }
  }, [plants, facilityId, setFacility]);

  const look = hydrated ? adminLook : 'soft';

  return (
    <AuthGate admin>
      {look === 'soft' ? <SoftShell>{children}</SoftShell> : <BrutalShell>{children}</BrutalShell>}
    </AuthGate>
  );
}
