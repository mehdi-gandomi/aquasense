'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { AuthGate } from '@/components/providers/AuthGate';
import { useAuth } from '@/stores/useAuth';
import { HardButton } from '@/components/ui/primitives';
import { ThemeToggle } from '@/components/providers/ThemeProvider';
import { PlantSwitcher } from '@/components/shell/PlantSwitcher';
import { useConsole } from '@/stores/useConsole';

const NAV = [
  { href: '/admin', label: 'Fleet' },
  { href: '/admin/clients', label: 'Clients' },
  { href: '/admin/plants', label: 'Plants' },
  { href: '/admin/users', label: 'Users' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const plants = useAuth((s) => s.plants);
  const facilityId = useConsole((s) => s.facilityId);
  const setFacility = useConsole((s) => s.setFacility);

  useEffect(() => {
    if (!plants.length) return;
    if (!plants.some((p) => p.id === facilityId)) {
      setFacility(plants[0].id);
    }
  }, [plants, facilityId, setFacility]);

  return (
    <AuthGate admin>
      <div className="flex h-dvh flex-col bg-shell-950">
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
    </AuthGate>
  );
}
