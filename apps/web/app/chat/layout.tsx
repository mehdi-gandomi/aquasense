'use client';

import Link from 'next/link';
import { AuthGate } from '@/components/providers/AuthGate';
import { TelemetryProvider } from '@/components/providers/TelemetryProvider';
import { PlantSwitcher } from '@/components/shell/PlantSwitcher';
import { StyleSwitch, ThemeToggle } from '@/components/providers/ThemeProvider';
import { useAuth } from '@/stores/useAuth';
import { HardButton } from '@/components/ui/primitives';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const logout = useAuth((s) => s.logout);

  return (
    <AuthGate>
      <TelemetryProvider>
        <div className="flex h-dvh flex-col overflow-hidden bg-shell-950">
          <header className="chrome flex h-14 shrink-0 items-center gap-3 border-b-2 border-line bg-shell-900 px-4">
            <Link href="/" className="text-[13px] font-bold uppercase tracking-[0.18em] text-white">
              Aquasense
            </Link>
            <span className="label-xs hidden sm:inline">Assistant</span>
            <div className="ml-auto flex items-center gap-2">
              <PlantSwitcher compact />
              <StyleSwitch compact />
              <ThemeToggle compact />
              <Link href="/" className="label-xs text-flow">
                Open twin
              </Link>
              <HardButton onClick={() => logout()}>Out</HardButton>
            </div>
          </header>
          <main className="min-h-0 flex-1">{children}</main>
        </div>
      </TelemetryProvider>
    </AuthGate>
  );
}
