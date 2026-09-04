import { Suspense } from 'react';
import { AuthGate } from '@/components/providers/AuthGate';
import { FacilityDeepLink } from '@/components/providers/FacilityDeepLink';
import { TelemetryProvider } from '@/components/providers/TelemetryProvider';
import { StatusBar } from '@/components/shell/StatusBar';
import { ProcessSpine } from '@/components/shell/ProcessSpine';
import { CommandDeck } from '@/components/shell/CommandDeck';
import { TimeRibbon } from '@/components/shell/TimeRibbon';

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <TelemetryProvider>
        <Suspense fallback={null}>
          <FacilityDeepLink />
        </Suspense>
        <div className="flex h-dvh flex-col overflow-hidden bg-shell-950">
          <StatusBar />

          <div className="flex min-h-0 flex-1">
            <ProcessSpine />
            <main className="relative min-w-0 flex-1 overflow-hidden">{children}</main>
            <CommandDeck />
          </div>

          <TimeRibbon />
        </div>
      </TelemetryProvider>
    </AuthGate>
  );
}
